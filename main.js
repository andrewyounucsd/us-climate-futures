const width = 960, height = 560;

const svg = d3.select("#map")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const projection = d3.geoAlbersUsa()
    .scale(1200)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const mapGroup = svg.append("g");

d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
    .then(us => {
        const states = topojson.feature(us, us.objects.states);

        mapGroup.selectAll(".state-path")
            .data(states.features)
            .enter()
            .append("path")
            .attr("class", "state-path")
            .attr("d", path)
            .attr("fill", "#2a2d3e")
            .attr("stroke", "#000")
            .attr("stroke-width", "0.5");
    });