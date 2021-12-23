(function () {
  ("use strict");

  const countryTopoJson = d3.json("data/countries.json");
  const wasteCSV = d3.json("data/waste.json");
  const trashTotal = "total_msw_total_msw_generated_tons_year";
  const population = "population_population_number_of_people";

  Promise.all([countryTopoJson, wasteCSV])
    .then(processData)
    .catch((error) => {
      console.log(error);
    });

  // Create  div for the tooltip and hide with opacity
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  function processData(data) {
    // console.log(data);
    const countryData = data[0];
    const wasteData = data[1];
    const geojson = topojson.feature(countryData, {
      type: "GeometryCollection",
      geometries: countryData.objects.ne_50m_admin_0_countries_lakes.geometries,
    });
    drawMap(geojson, wasteData);
    // drawLegend(geojson, wasteData);
  }

  function drawMap(geojson, wasteData) {
    // D3 time
    const mapContainer = d3.select("#map");
    const width = mapContainer.node().offsetWidth - 60;
    const height = mapContainer.node().offsetHeight - 60;

    const svg = mapContainer
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("top", 5)
      .style("left", 5);

    // Create  div for the tooltip and hide with opacity
    const tooltip = d3
      .select(".mapSection")
      .append("div")
      .attr(
        "class",
        "my-tooltip text-black py-1 px-2 rounded position-absolute invisible"
      );

    // when mouse moves over the mapContainer
    mapContainer.on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 30 + "px");
    });

    let dataQuantile = [];

    //join geojson and csv
    for (let i of geojson.features) {
      // console.log(i);
      for (let j of wasteData) {
        if (i.properties.adm0_a3 == j.iso3c) {
          i.properties.wasteData = j;
          if (j[trashTotal] != "NA") {
            dataQuantile.push(j[trashTotal] / j[population]);
          }
          break;
        } else {
          i.properties.wasteData = {};
          i.properties.wasteData[trashTotal] = "NA";
        }
      }
    }

    const color = d3
      .scaleQuantile()
      .domain(dataQuantile)
      // Use a sequential color scheme. check out https://gka.github.io/palettes
      .range(['#ffffe0', '#e9c5b3', '#d08d88', '#b4535f', '#94003a']);

    const projection = d3.geoNaturalEarth1().fitSize([width, height], geojson);

    const path = d3.geoPath().projection(projection);

    const country = svg
      .append("g")
      .selectAll("path")
      .data(geojson.features)
      .join("path")
      .attr("d", (d) => {
        // console.log(path(d));
        return path(d);
      })
      .attr("class", "country")
      .style("fill", (d) => {
        if (d.properties.wasteData[trashTotal] != "NA") {
          return color(
            d.properties.wasteData[trashTotal] /
              d.properties.wasteData[population]
          );
        }
      });

    // applies event listeners to our polygons for user interaction
    country
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).classed("hover", true).raise();

        const waste = d.properties.wasteData;

        content = `<h2 class="mb-0 pb-0">${d.properties.sovereignt}</h2>`;

        if (
          waste.population_population_number_of_people != "NA" ||
          waste.population_population_number_of_people != "undefined"
        ) {
          content += `<strong>Population</strong>: ${waste.population_population_number_of_people}<br>`;
        }

        content +=
          `<strong>Total wastes generated</strong> ${waste.total_msw_total_msw_generated_tons_year} tons per year<br>` +
          `<strong>Type of composition wastes in Percent below</strong><br>` +
          `<strong>Plastic</strong>: ${waste.composition_plastic_percent} <br>` +
          `<strong>Glass</strong>: ${waste.composition_glass_percent} <br>` +
          `<strong>Metal</strong>: ${waste.composition_metal_percent} <br>` +
          `<strong>Paper & Cardboard</strong>: ${waste.composition_paper_cardboard_percent} <br>` +
          `<strong>Rubber & Leather</strong>: ${waste.composition_rubber_leather_percent} <br>` +
          `<strong>Wood</strong>: ${waste.composition_wood_percent} <br>` +
          `<strong>Garden</strong>: ${waste.composition_yard_garden_green_waste_percent} <br>` +
          `<strong>Organic Food</strong>: ${waste.composition_food_organic_waste_percent} <br>`;
        tooltip.classed("invisible", false).html(content); // make tooltip visible and update info
      })

      .on("mouseout", (event, d) => {
        // when mousing out of an element
        d3.select(event.currentTarget).classed("hover", false); // remove the class from the polygon
        tooltip.classed("invisible", true); // hide the element
      });

    makeZoom(svg, width, height);
    drawLegend(color, geojson);
  }

  function drawLegend(color, geojson) {

        // get breaks for legend
        const data = color.quantiles()
        // add zero for first class
        data.unshift(0);
      const upper = color.domain().pop().toFixed(2);

   
    // const values = [];
    // const totalVal = "gdp";
    // const population = "population_population_number_of_people";

    // //join geojson and csv
    // for (let i of geojson.features) {
    //   // console.log(i);
    //   for (let j of wasteData) {
    //     if (i.properties.adm0_a3 == j.iso3c) {
    //       i.properties.wasteData = j;
    //       if (j[totalVal] != "NA") {
    //         values.push(j[totalVal] / j[population]);
    //       }
    //       break;
    //     } else {
    //       i.properties.wasteData = {};
    //       i.properties.wasteData[totalVal] = "NA";
    //     }
    //   }
    // }

    // var color = d3.scaleOrdinal().domain(values).range(d3.schemeSet1);
    //svg legend rect not working? how to list only max 10. not sure how to do similar xxx - xxx
    var size = 20;
    var legend = d3.select("#legend");
    const width = legend.node().offsetWidth;

    // append a new SVG element to the container
    const svg = legend
      .append('svg')
      .attr('width', width)
      .attr('height', 200)
      // .attr('transform', `translate(0, 0)`)
      
    svg
      .append('g')
      .selectAll("path")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", 5)
      .attr("y", function (d, i) {
        return 5 + i * (size + 5);
      })
      .attr("width", size)
      .attr("height", size)
      .style("fill", function (d) {
        
          return color(d)
        }
      )
      

    svg
      .selectAll("label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", 30)
      .attr("y", function (d, i) {
        return 15 + (i * (size + 5));
      })

      .text(function (d, i) {
        console.log(i)
        let label = ``;
        if (i == data.length - 1) {
          label =  `${data[i].toFixed(2)} - ${upper}`;
      } else {
        label = `${data[i].toFixed(2)} - ${data[i + 1].toFixed(2)}`;;
      }
      return label
    })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle");
  }

  function makeZoom(svg, width, height) {
    const zoom = d3
      .zoom()
      // on zoom (many events fire this event like mousemove, wheel, dblclick, etc.)...
      .on("zoom", (event) => {
        svg
          // select all paths in svg
          .selectAll("path")
          // transform path based on event
          .attr("transform", event.transform)
          // change stroke width on zoom
          .attr("stroke-width", 1 / event.transform.k);
      });

    // Attach function to svg
    svg.call(zoom);
  }

  // When the browser resizes...
  window.addEventListener("resize", () => {
    // remove existing SVG
    d3.selectAll("svg").remove();
    document.getElementById("map").innerHTML = "View map only on Desktop";
  });
})();
