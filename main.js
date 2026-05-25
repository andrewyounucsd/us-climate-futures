const width = 960, height = 560;
let currentVar = "temperature";
let currentYear = 2000;
let climateData = {};

const svg = d3.select("#map")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const projection = d3.geoAlbersUsa()
    .scale(1200)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);
const mapGroup = svg.append("g");

const tempScale = d3.scaleSequential()
    .domain([-2, 6])
    .interpolator(d3.interpolateYlOrRd)
    .clamp(true);

const precipScale = d3.scaleSequential()
    .domain([0, 6])
    .interpolator(d3.interpolateBlues)
    .clamp(true);

const stateIdToName = {
    "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
    "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
    "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho", "17": "Illinois",
    "18": "Indiana", "19": "Iowa", "20": "Kansas", "21": "Kentucky",
    "22": "Louisiana", "23": "Maine", "24": "Maryland", "25": "Massachusetts",
    "26": "Michigan", "27": "Minnesota", "28": "Mississippi", "29": "Missouri",
    "30": "Montana", "31": "Nebraska", "32": "Nevada", "33": "New Hampshire",
    "34": "New Jersey", "35": "New Mexico", "36": "New York", "37": "North Carolina",
    "38": "North Dakota", "39": "Ohio", "40": "Oklahoma", "41": "Oregon",
    "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
    "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah",
    "50": "Vermont", "51": "Virginia", "53": "Washington", "54": "West Virginia",
    "55": "Wisconsin", "56": "Wyoming"
};

function getStateName(id) {
    return stateIdToName[String(id).padStart(2, "0")];
}

function getStateColor(d) {
    const stateName = getStateName(d.id);
    if (!stateName || !climateData[stateName]) return "#2a2d3e";

    const yearData = climateData[stateName]?.years?.[currentYear];
    if (!yearData) return "#2a2d3e";

    if (currentVar === "temperature") {
        const val = yearData.tas_hist ?? yearData.tas_ssp585;
        if (val === undefined) return "#2a2d3e";
        return tempScale(val);
    } else {
        const val = yearData.pr_hist ?? yearData.pr_ssp585;
        return val !== undefined ? precipScale(val) : "#2a2d3e";
    }
}

function updateMap() {
    mapGroup.selectAll(".state-path")
        .transition()
        .duration(300)
        .attr("fill", d => getStateColor(d));
}

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
    d3.json("data/climate_data.json")
]).then(([us, climate]) => {
    climateData = climate;

    const states = topojson.feature(us, us.objects.states);

    mapGroup.selectAll(".state-path")
        .data(states.features)
        .enter()
        .append("path")
        .attr("class", "state-path")
        .attr("d", path)
        .attr("fill", "#2a2d3e")
        .attr("stroke", "#000")
        .attr("stroke-width", "0.5")
        .on("click", (event, d) => showSidebar(d));

    updateMap();
    setupControls();
});

function setupControls() {
    const slider = document.getElementById("year-slider");
    const yearDisplay = document.getElementById("year-display");

    slider.addEventListener("input", () => {
        currentYear = +slider.value;
        yearDisplay.textContent = currentYear;
        updateMap();
    });

    document.querySelectorAll(".toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentVar = btn.dataset.var;
            updateMap();
        });
    });
}

function showSidebar(d) {
    const stateName = getStateName(d.id);
    if (!stateName) return;

    const yearData = climateData[stateName]?.years?.[currentYear];
    const tas = yearData?.tas_hist ?? yearData?.tas_ssp585;
    const tasRaw = yearData?.tas_raw;
    const pr = yearData?.pr_hist ?? yearData?.pr_ssp585;

    const tasRaw_F = tasRaw !== undefined ? (tasRaw * 9/5 + 32).toFixed(1) : null;
    const tas_F = tas !== undefined ? (tas * 9/5).toFixed(2) : null;

    document.getElementById("state-name").textContent = stateName;
    document.getElementById("state-stats").innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Avg Temperature</span>
            <span class="stat-value">${tasRaw_F !== null ? tasRaw_F + " °F" : "N/A"}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Warming Since 1995</span>
            <span class="stat-value">${tas_F !== null ? (tas > 0 ? "+" : "") + tas_F + " °F" : "N/A"}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Precipitation</span>
            <span class="stat-value">${pr !== undefined ? pr.toFixed(2) + " mm/day" : "N/A"}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Year</span>
            <span class="stat-value">${currentYear}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Scenario</span>
            <span class="stat-value">${currentYear <= 2014 ? "Historical" : "SSP5-8.5"}</span>
        </div>
    `;

    document.getElementById("sidebar").classList.remove("hidden");
}

document.getElementById("close-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("hidden");
});