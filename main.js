const width = 960, height = 560;
let currentVar = "temperature";
let currentYear = 2015;
let currentScenario = "ssp585";
let climateData = {};
let focusedState = null;

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
        const val = currentScenario === "historical" 
            ? yearData.tas_hist 
            : yearData[`tas_${currentScenario}`];
        if (val === undefined) return "#2a2d3e";
        return tempScale(val);
    } else {
        const val = currentScenario === "historical"
            ? yearData.pr_hist
            : yearData[`pr_${currentScenario}`];
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
    drawLegend();
});

function setupControls() {
    const slider = document.getElementById("year-slider");
    const yearDisplay = document.getElementById("year-display");
    const sspSelect = document.getElementById("ssp-select");
    sspSelect.addEventListener("change", () => {
        currentScenario = sspSelect.value;
        if (currentScenario === "historical") {
            slider.min = 1950;
            slider.max = 2014;
            if (currentYear > 2014) {
                currentYear = 2014;
                slider.value = 2014;
                yearDisplay.textContent = 2014;
            }
        } else {
            slider.min = 2015;
            slider.max = 2100;
            if (currentYear < 2015) {
                currentYear = 2015;
                slider.value = 2015;
                yearDisplay.textContent = 2015;
            }
        }
        updateMap();
    });

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
            drawLegend();
        });
    });
}

function drawLegend() {
    const legendSvg = d3.select("#legend-svg");
    legendSvg.selectAll("*").remove();

    const legendWidth = 300, legendHeight = 16;
    const defs = legendSvg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "legend-grad");

    if (currentVar === "temperature") {
        document.getElementById("legend-label").textContent = "Temperature Anomaly: yellow = cooler, red = hotter";
        d3.range(0, 1.01, 0.1).forEach(t => {
            grad.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", tempScale(t * 8 - 2));
        });
        const scale = d3.scaleLinear().domain([-2, 6]).range([0, legendWidth]);
        legendSvg.append("rect")
            .attr("x", 10)
            .attr("width", legendWidth).attr("height", legendHeight)
            .style("fill", "url(#legend-grad)");
        legendSvg.append("g")
            .attr("transform", `translate(10, ${legendHeight})`)
            .call(d3.axisBottom(scale).ticks(5).tickSize(3))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll("text").style("fill", "#888").style("font-size", "10px"));
    } else {
        document.getElementById("legend-label").textContent = "Precipitation (mm/day): light = dry, dark = wet";
        d3.range(0, 1.01, 0.1).forEach(t => {
            grad.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", precipScale(t * 6));
        });
        const scale = d3.scaleLinear().domain([0, 6]).range([0, legendWidth]);
        legendSvg.append("rect")
            .attr("x", 10)
            .attr("width", legendWidth).attr("height", legendHeight)
            .style("fill", "url(#legend-grad)");
        legendSvg.append("g")
            .attr("transform", `translate(10, ${legendHeight})`)
            .call(d3.axisBottom(scale).ticks(5).tickSize(3))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll("text").style("fill", "#888").style("font-size", "10px"));
    }
}

function showSidebar(d) {
    const stateName = getStateName(d.id);
    if (!stateName) return;

    const yearData = climateData[stateName]?.years?.[currentYear];
    
    const tas = currentScenario === "historical"
        ? yearData?.tas_hist
        : yearData?.[`tas_${currentScenario}`];
    const tasRaw = currentScenario === "historical"
        ? yearData?.tas_raw
        : yearData?.[`tas_raw_${currentScenario}`];
    const pr = currentScenario === "historical"
        ? yearData?.pr_hist
        : yearData?.[`pr_${currentScenario}`];

    const tasRaw_F = tasRaw !== undefined ? (tasRaw * 9/5 + 32).toFixed(1) : null;
    const tas_F = tas !== undefined ? (tas * 9/5).toFixed(2) : null;

    const scenarioLabels = {
        "historical": "Historical",
        "ssp126": "SSP1-2.6 (Optimistic)",
        "ssp245": "SSP2-4.5 (Middle Road)",
        "ssp585": "SSP5-8.5 (Worst Case)"
    };

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
            <span class="stat-value">${scenarioLabels[currentScenario]}</span>
        </div>
    `;

    document.getElementById("sidebar").classList.remove("hidden");
    document.getElementById("focus-btn").onclick = () => enterFocusMode(d);
}

document.getElementById("close-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("hidden");
});

function enterFocusMode(d) {
    focusedState = d;
    const stateName = getStateName(d.id);

    const stateFeature = {type: "FeatureCollection", features: [d]};
    const newProjection = d3.geoAlbersUsa()
        .fitExtent([[20, 20], [width - 20, height - 20]], stateFeature);
    const newPath = d3.geoPath().projection(newProjection);

    mapGroup.selectAll(".state-path")
        .transition().duration(600)
        .attr("opacity", dd => getStateName(dd.id) === stateName ? 1 : 0)
        .attr("d", newPath);

    const indicator = document.getElementById("mode-indicator");
    indicator.style.display = "block";
    indicator.innerHTML = `Focus: ${stateName} <span id="exit-focus" style="cursor:pointer;margin-left:8px;">✕</span>`;
    document.getElementById("exit-focus").addEventListener("click", exitFocusMode);

    document.getElementById("sidebar").classList.add("hidden");
}

function exitFocusMode() {
    focusedState = null;

    const originalPath = d3.geoPath().projection(projection);

    mapGroup.selectAll(".state-path")
        .transition().duration(600)
        .attr("opacity", 1)
        .attr("d", originalPath)
        .attr("fill", d => getStateColor(d));

    document.getElementById("mode-indicator").style.display = "none";
}