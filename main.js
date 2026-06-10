const width = 960, height = 560;
let currentVar = "temperature";
let currentYear = 2015;
let currentScenario = "ssp585";
let currentMonth = null;
let climateData = {};
let monthlyData = {};
let focusedState = null;
let compareState1 = null;
let compareState2 = null;
let compareMode = false;
let selectedState = null;

const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];

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

const humidityScale = d3.scaleSequential()
    .domain([30, 90])
    .interpolator(d3.interpolatePurples)
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

function getYearData(stateName) {
    if (currentMonth !== null) {
        const key = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
        return monthlyData[stateName]?.months?.[key];
    }
    return climateData[stateName]?.years?.[currentYear];
}

function getStateColor(d) {
    const stateName = getStateName(d.id);
    if (!stateName) return "#2a2d3e";

    const yearData = getYearData(stateName);
    if (!yearData) return "#2a2d3e";

    if (currentVar === "temperature") {
        const val = currentScenario === "historical"
            ? yearData.tas_hist
            : yearData[`tas_${currentScenario}`];
        if (val === undefined) return "#2a2d3e";
        return tempScale(val);
    } else if (currentVar === "precipitation") {
        const val = currentScenario === "historical"
            ? yearData.pr_hist
            : yearData[`pr_${currentScenario}`];
        return val !== undefined ? precipScale(val) : "#2a2d3e";
    } else {
        const val = currentScenario === "historical"
            ? yearData.hurs_hist
            : yearData[`hurs_${currentScenario}`];
        return val !== undefined ? humidityScale(val) : "#2a2d3e";
    }
}

function updateMap() {
    mapGroup.selectAll(".state-path")
        .transition()
        .duration(300)
        .attr("fill", d => getStateColor(d));

    if (compareMode && compareState1 && compareState2) {
        renderComparePanel();
    }

    if (selectedState && !document.getElementById("sidebar").classList.contains("hidden")) {
        showSidebar(selectedState);
    }
}

const tooltip = d3.select("body").append("div")
    .attr("id", "map-tooltip")
    .style("position", "absolute")
    .style("background", "#1e2130")
    .style("border", "1px solid #3a86ff")
    .style("border-radius", "8px")
    .style("padding", "8px 14px")
    .style("font-size", "0.85rem")
    .style("color", "#fff")
    .style("font-weight", "600")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("z-index", "200");

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
    d3.json("data/climate_data.json"),
    d3.json("data/climate_data_monthly.json")
]).then(([us, climate, monthly]) => {
    climateData = climate;
    monthlyData = monthly;

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
        .on("mouseover", (event, d) => {
            const stateName = getStateName(d.id);
            if (stateName) {
                tooltip.style("display", "block").text(stateName);
            }
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
        })
        .on("click", (event, d) => {
            if (compareMode && !compareState2) {
                compareState2 = d;
                renderComparePanel();
            } else {
                showSidebar(d);
            }
        });

    updateMap();
    setupControls();
    drawLegend();
});

function setupControls() {
    const slider = document.getElementById("year-slider");
    const yearDisplay = document.getElementById("year-display");
    const yearInput = document.getElementById("year-input");
    const sspSelect = document.getElementById("ssp-select");

    sspSelect.addEventListener("change", () => {
        currentScenario = sspSelect.value;
        if (currentScenario === "historical") {
            slider.min = 1950;
            slider.max = 2014;
            yearInput.min = 1950;
            yearInput.max = 2014;
            if (currentYear > 2014) {
                currentYear = 2014;
                slider.value = 2014;
                yearInput.value = 2014;
                yearDisplay.textContent = 2014;
            }
        } else {
            slider.min = 2015;
            slider.max = 2100;
            yearInput.min = 2015;
            yearInput.max = 2100;
            if (currentYear < 2015) {
                currentYear = 2015;
                slider.value = 2015;
                yearInput.value = 2015;
                yearDisplay.textContent = 2015;
            }
        }
        updateMap();
    });

    slider.addEventListener("input", () => {
        currentYear = +slider.value;
        yearDisplay.textContent = currentYear;
        yearInput.value = currentYear;
        updateMap();
    });

    yearInput.addEventListener("change", () => {
        const min = currentScenario === "historical" ? 1950 : 2015;
        const max = currentScenario === "historical" ? 2014 : 2100;
        let val = Math.max(min, Math.min(max, parseInt(yearInput.value) || currentYear));
        currentYear = val;
        yearInput.value = val;
        slider.value = val;
        yearDisplay.textContent = val;
        updateMap();
    });

    document.querySelectorAll(".month-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".month-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const month = +btn.dataset.month;
            currentMonth = month === 0 ? null : month;
            updateMap();
            drawLegend();
        });
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

    document.getElementById("reset-btn").addEventListener("click", () => {
        if (compareMode) exitCompareMode();
        else if (focusedState) exitFocusMode();
    });
}

function drawLegend() {
    const legendSvg = d3.select("#legend-svg");
    legendSvg.selectAll("*").remove();

    const legendWidth = 300, legendHeight = 16;
    const defs = legendSvg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "legend-grad");

    if (currentVar === "temperature") {
        document.getElementById("legend-label").textContent = currentMonth !== null
            ? `Temperature Anomaly (${monthNames[currentMonth - 1]}): yellow = cooler, red = hotter`
            : "Temperature Anomaly (Annual avg): yellow = cooler, red = hotter";
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
    } else if (currentVar === "precipitation") {
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
    } else {
        document.getElementById("legend-label").textContent = "Relative Humidity (%): light = dry, dark = humid";
        d3.range(0, 1.01, 0.1).forEach(t => {
            grad.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", humidityScale(30 + t * 60));
        });
        const scale = d3.scaleLinear().domain([30, 90]).range([0, legendWidth]);
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

    selectedState = d;
    const yearData = getYearData(stateName);

    const tas = currentScenario === "historical"
        ? yearData?.tas_hist
        : yearData?.[`tas_${currentScenario}`];
    const tasRaw = currentScenario === "historical"
        ? yearData?.tas_raw
        : yearData?.[`tas_raw_${currentScenario}`];
    const pr = currentScenario === "historical"
        ? yearData?.pr_hist
        : yearData?.[`pr_${currentScenario}`];
    const hurs = currentScenario === "historical"
        ? yearData?.hurs_hist
        : yearData?.[`hurs_${currentScenario}`];
    const tasmax = currentScenario === "historical"
        ? null
        : yearData?.[`tasmax_${currentScenario}`];
    const tasmin = currentScenario === "historical"
        ? null
        : yearData?.[`tasmin_${currentScenario}`];

    const tasRaw_F = tasRaw !== undefined ? (tasRaw * 9/5 + 32).toFixed(1) : null;
    const tas_F = tas !== undefined ? (tas * 9/5).toFixed(2) : null;
    const tasmax_F = tasmax !== null && tasmax !== undefined ? (tasmax * 9/5 + 32).toFixed(1) : null;
    const tasmin_F = tasmin !== null && tasmin !== undefined ? (tasmin * 9/5 + 32).toFixed(1) : null;

    const scenarioLabels = {
        "historical": "Historical",
        "ssp126": "SSP1-2.6 (Optimistic)",
        "ssp245": "SSP2-4.5 (Middle Road)",
        "ssp585": "SSP5-8.5 (Worst Case)"
    };

    const monthLabel = currentMonth !== null ? monthNames[currentMonth - 1] : "Annual";

    document.getElementById("state-name").textContent = stateName;
    document.getElementById("state-stats").innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Avg Temperature</span>
            <span class="stat-value">${tasRaw_F !== null ? tasRaw_F + " °F" : "N/A"}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">${currentMonth !== null ? `Warming vs avg ${monthNames[currentMonth - 1]}` : "Warming Since 1995"}</span>
            <span class="stat-value">${tas_F !== null ? (tas > 0 ? "+" : "") + tas_F + " °F" : "N/A"}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Precipitation</span>
            <span class="stat-value">${pr !== undefined ? pr.toFixed(2) + " mm/day" : "N/A"}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Relative Humidity</span>
            <span class="stat-value">${hurs !== undefined ? hurs.toFixed(1) + "%" : "N/A"}</span>
        </div>
        ${tasmax_F !== null ? `
        <div class="stat-item">
            <span class="stat-label">Hottest Day of Year</span>
            <span class="stat-value">${tasmax_F} °F</span>
        </div>` : ""}
        ${tasmin_F !== null ? `
        <div class="stat-item">
            <span class="stat-label">Coldest Day of Year</span>
            <span class="stat-value">${tasmin_F} °F</span>
        </div>` : ""}
        <div class="stat-item">
            <span class="stat-label">Year</span>
            <span class="stat-value">${currentYear} — ${monthLabel}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Scenario</span>
            <span class="stat-value">${scenarioLabels[currentScenario]}</span>
        </div>
    `;

    document.getElementById("sidebar").classList.remove("hidden");
    document.getElementById("focus-btn").onclick = () => enterFocusMode(d);
    document.getElementById("compare-btn").onclick = () => enterCompareMode(d);
}

document.getElementById("close-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("hidden");
    selectedState = null;
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

    document.getElementById("mode-indicator").style.display = "block";
    document.getElementById("mode-indicator").innerHTML = `Focus: ${stateName}`;
    document.getElementById("sidebar").classList.add("hidden");
    document.getElementById("reset-bar").classList.remove("hidden");
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
    document.getElementById("reset-bar").classList.add("hidden");
}

function enterCompareMode(d) {
    compareState1 = d;
    compareMode = true;

    document.getElementById("sidebar").classList.add("hidden");
    document.getElementById("mode-indicator").style.display = "block";
    document.getElementById("mode-indicator").innerHTML = `Select a state to compare with ${getStateName(d.id)}`;
    document.getElementById("reset-bar").classList.remove("hidden");

    mapGroup.selectAll(".state-path")
        .transition().duration(300)
        .attr("opacity", dd => dd === d ? 1 : 0.3);
}

function renderComparePanel() {
    const name1 = getStateName(compareState1.id);
    const name2 = getStateName(compareState2.id);

    const yearData1 = getYearData(name1);
    const yearData2 = getYearData(name2);

    const getTas = (yd) => currentScenario === "historical" ? yd?.tas_hist : yd?.[`tas_${currentScenario}`];
    const getTasRaw = (yd) => currentScenario === "historical" ? yd?.tas_raw : yd?.[`tas_raw_${currentScenario}`];
    const getPr = (yd) => currentScenario === "historical" ? yd?.pr_hist : yd?.[`pr_${currentScenario}`];
    const getHurs = (yd) => currentScenario === "historical" ? yd?.hurs_hist : yd?.[`hurs_${currentScenario}`];
    const getTasmax = (yd) => currentScenario === "historical" ? null : yd?.[`tasmax_${currentScenario}`];
    const getTasmin = (yd) => currentScenario === "historical" ? null : yd?.[`tasmin_${currentScenario}`];

    const formatTemp = (val) => val !== undefined && val !== null ? (val * 9/5 + 32).toFixed(1) + " °F" : "N/A";
    const formatWarming = (val) => val !== undefined ? (val > 0 ? "+" : "") + (val * 9/5).toFixed(2) + " °F" : "N/A";
    const formatPr = (val) => val !== undefined ? val.toFixed(2) + " mm/day" : "N/A";
    const formatHurs = (val) => val !== undefined ? val.toFixed(1) + "%" : "N/A";

    const scenarioLabels = {
        "historical": "Historical",
        "ssp126": "SSP1-2.6 (Optimistic)",
        "ssp245": "SSP2-4.5 (Middle Road)",
        "ssp585": "SSP5-8.5 (Worst Case)"
    };

    const monthLabel = currentMonth !== null ? monthNames[currentMonth - 1] : "Annual";

    let panel = document.getElementById("compare-panel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "compare-panel";
        document.getElementById("app").insertBefore(panel, document.getElementById("takeaway"));
        document.getElementById("map-container").style.display = "none";
        document.getElementById("legend").style.display = "none";
    }

    document.getElementById("mode-indicator").innerHTML = `Comparing: ${name1} vs ${name2}`;

    const tasmaxRow = (yd) => getTasmax(yd) !== null ? `
        <div class="compare-stat">
            <span class="stat-label">Hottest Day of Year</span>
            <span class="stat-value">${formatTemp(getTasmax(yd))}</span>
        </div>` : "";

    const tasminRow = (yd) => getTasmin(yd) !== null ? `
        <div class="compare-stat">
            <span class="stat-label">Coldest Day of Year</span>
            <span class="stat-value">${formatTemp(getTasmin(yd))}</span>
        </div>` : "";

    panel.innerHTML = `
        <div class="compare-header">
            <h2>State Comparison — ${currentYear} (${monthLabel})</h2>
            <p class="compare-scenario">${scenarioLabels[currentScenario]}</p>
        </div>
        <div class="compare-grid">
            <div class="compare-state">
                <h3>${name1}</h3>
                <div class="compare-stat">
                    <span class="stat-label">Avg Temperature</span>
                    <span class="stat-value">${formatTemp(getTasRaw(yearData1))}</span>
                </div>
                <div class="compare-stat">
                    <span class="stat-label">${currentMonth !== null ? `Warming vs avg ${monthNames[currentMonth - 1]}` : "Warming Since 1995"}</span>
                    <span class="stat-value">${formatWarming(getTas(yearData1))}</span>
                </div>
                <div class="compare-stat">
                    <span class="stat-label">Precipitation</span>
                    <span class="stat-value">${formatPr(getPr(yearData1))}</span>
                </div>
                <div class="compare-stat">
                    <span class="stat-label">Relative Humidity</span>
                    <span class="stat-value">${formatHurs(getHurs(yearData1))}</span>
                </div>
                ${tasmaxRow(yearData1)}
                ${tasminRow(yearData1)}
            </div>
            <div class="compare-divider">VS</div>
            <div class="compare-state">
                <h3>${name2}</h3>
                <div class="compare-stat">
                    <span class="stat-label">Avg Temperature</span>
                    <span class="stat-value">${formatTemp(getTasRaw(yearData2))}</span>
                </div>
                <div class="compare-stat">
                    <span class="stat-label">${currentMonth !== null ? `Warming vs avg ${monthNames[currentMonth - 1]}` : "Warming Since 1995"}</span>
                    <span class="stat-value">${formatWarming(getTas(yearData2))}</span>
                </div>
                <div class="compare-stat">
                    <span class="stat-label">Precipitation</span>
                    <span class="stat-value">${formatPr(getPr(yearData2))}</span>
                </div>
                <div class="compare-stat">
                    <span class="stat-label">Relative Humidity</span>
                    <span class="stat-value">${formatHurs(getHurs(yearData2))}</span>
                </div>
                ${tasmaxRow(yearData2)}
                ${tasminRow(yearData2)}
            </div>
        </div>
    `;
}

function exitCompareMode() {
    compareState1 = null;
    compareState2 = null;
    compareMode = false;

    document.getElementById("map-container").style.display = "flex";
    document.getElementById("legend").style.display = "flex";

    const panel = document.getElementById("compare-panel");
    if (panel) panel.remove();

    mapGroup.selectAll(".state-path")
        .transition().duration(300)
        .attr("opacity", 1)
        .attr("fill", d => getStateColor(d));

    document.getElementById("mode-indicator").style.display = "none";
    document.getElementById("reset-bar").classList.add("hidden");
}

const scroller = scrollama();

scroller
    .setup({
        step: ".scrolly-trigger",
        offset: 0.5,
    })
    .onStepEnter(({ element }) => {
        const step = element.dataset.step;
        document.querySelectorAll(".scrolly-step").forEach(el => el.classList.remove("active"));
        document.querySelector(`.scrolly-step[data-step="${step}"]`).classList.add("active");
    })
    .onStepExit(({ element, direction }) => {
        if (direction === "up") {
            const step = +element.dataset.step;
            document.querySelectorAll(".scrolly-step").forEach(el => el.classList.remove("active"));
            if (step > 1) {
                document.querySelector(`.scrolly-step[data-step="${step - 1}"]`).classList.add("active");
            }
        }
    });

window.addEventListener("resize", scroller.resize);