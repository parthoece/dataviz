document.getElementById("loading-overlay").style.display = "flex";
// 主程式
d3.csv("./data/bar_chart/all_countries.csv").then(function (rawData) {
  // 過濾資料：初始只移除值為 0 的資料
  let filteredData = rawData.filter(
    (d) => +d["Refugees under UNHCR's mandate"] !== 0
  );

  // 初始化下拉選單
  createDropdownOptions(filteredData, "Year", "year-select");
  createDropdownOptions(filteredData, "Country of origin", "origin-select");
  createDropdownOptions(filteredData, "Country of asylum", "asylum-select");

  // 初始繪製
  const initialGraph = makeGraph(filteredData, "all", "all", "all", 0);
  draw(initialGraph);

  document.getElementById("loading-overlay").style.display = "none";

  // 綁定篩選條件事件並記錄最後操作的選單
  d3.selectAll("select, #threshold-select").on("change", function (event) {
    const changedElement = event.target.id; // 獲取最後操作的選單 ID
    const filters = getDropdownValues();
    const thresholdValue = +filters.threshold || 0; // 如果是 undefined 或 NaN，則設置為 0

    // 動態調整其他選單
    adjustDropdownOptions(filteredData, filters, changedElement);

    // 根據篩選條件更新數據並繪製圖表
    let currentFilteredData = filteredData.filter((d) => {
      return (
        (filters.origin === "all" ||
          d["Country of origin"] === filters.origin) &&
        (filters.asylum === "all" ||
          d["Country of asylum"] === filters.asylum) &&
        d["Refugees under UNHCR's mandate"] >= thresholdValue
      );
    });

    clearCanvas(); // 清空畫布

    // 生成圖表數據並重新繪製
    const graph = makeGraph(
      currentFilteredData,
      filters.year,
      filters.origin,
      filters.asylum,
      thresholdValue
    );
    draw(graph);
  });
});

function adjustDropdownOptions(data, filters, changedElement) {
  // 如果改變的是出國選單
  if (changedElement === "origin-select") {
    const filteredAsylum = data.filter((d) => {
      return (
        d["Country of origin"] === filters.origin &&
        +d["Refugees under UNHCR's mandate"] !== 0
      );
    });
    createDropdownOptions(filteredAsylum, "Country of asylum", "asylum-select");
  }

  // 如果改變的是入國選單
  if (changedElement === "asylum-select") {
    const filteredOrigin = data.filter((d) => {
      return (
        d["Country of asylum"] === filters.asylum &&
        +d["Refugees under UNHCR's mandate"] !== 0
      );
    });
    createDropdownOptions(filteredOrigin, "Country of origin", "origin-select");
  }
}

// 建立下拉選單選項
function createDropdownOptions(data, field, elementId) {
  // 獲取篩選後的唯一值
  const uniqueValues = Array.from(new Set(data.map((d) => d[field]))).sort();

  // 更新下拉選單
  const dropdown = d3.select(`#${elementId}`);
  const currentValue = dropdown.property("value"); // 取得當前選中值

  dropdown.selectAll("option").remove(); // 清空舊選項
  dropdown.append("option").text("All").attr("value", "all"); // 添加 "All" 選項

  uniqueValues.forEach((value) => {
    dropdown.append("option").text(value).attr("value", value);
  });

  // 恢復選中值（若仍然有效）
  const options = uniqueValues.includes(currentValue) ? currentValue : "all";
  dropdown.property("value", options); // 設置選中的值
}

// 取得下拉選單值
function getDropdownValues() {
  return {
    year: d3.select("#year-select").property("value"),
    origin: d3.select("#origin-select").property("value"),
    asylum: d3.select("#asylum-select").property("value"),
    threshold: d3.select("#threshold-select").property("value"),
  };
}

// 清空畫布
function clearCanvas() {
  d3.select("#chart").selectAll("*").remove();
}

// 建立 Sankey 資料結構
function makeGraph(data, year, origin, asylum, threshold) {
  const graph = { nodes: [], links: [] };

  const originMap = new Map();
  const asylumMap = new Map();

  const yearFilteredData = data.filter(
    (d) =>
      (year === "all" || d.Year === year) &&
      (origin === "all" || d["Country of origin"] === origin) &&
      (asylum === "all" || d["Country of asylum"] === asylum) &&
      +d["Refugees under UNHCR's mandate"] >= threshold // 應用門檻
  );

  yearFilteredData.forEach((d) => {
    const origin = d["Country of origin"];
    const asylum = d["Country of asylum"];

    // 添加原籍國節點
    if (!originMap.has(origin)) {
      originMap.set(origin, graph.nodes.length);
      graph.nodes.push({ name: origin, role: "origin" });
    }

    // 添加庇護國節點
    if (!asylumMap.has(asylum)) {
      asylumMap.set(asylum, graph.nodes.length);
      graph.nodes.push({ name: asylum, role: "asylum" });
    }

    // 添加連線
    graph.links.push({
      source: originMap.get(origin),
      target: asylumMap.get(asylum),
      value: +d["Refugees under UNHCR's mandate"],
    });
  });

  return graph;
}

// 繪製 Sankey 圖表
function draw(graph) {
  const width = 1200;
  const height = Math.max(800, graph.nodes.length * 20);

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const sankey = d3
    .sankey()
    .nodeWidth(20)
    .nodePadding(30)
    .extent([
      [200, 50],
      [width - 200, height - 50],
    ])
    .nodeAlign((d) => (d.role === "origin" ? 0 : 1));

  const { nodes, links } = sankey(graph);

  const color = d3
    .scaleOrdinal(d3.schemeCategory10)
    .domain(nodes.map((d) => d.name));

  // 繪製連線
  const tooltip = createTooltip();
  svg
    .append("g")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => color(d.source.name))
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .attr("fill", "none")
    .on("mouseover", (event, d) => tooltip.style("opacity", 1))
    .on("mousemove", (event, d) => {
      tooltip
        .html(`${d.source.name} to ${d.target.name} : ${d.value}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 30}px`);
    })
    .on("mouseleave", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    });

  let draggedNode = null; // 記錄被拖曳的節點
  let originalIndex = null; // 記錄原始索引

  // 繪製節點
  const nodeGroup = svg.append("g").selectAll("g").data(nodes).join("g");

  nodeGroup
    .append("rect")
    .attr("x", (d) => d.x0 + 10)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0 - 15)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", "black");

  nodeGroup
    .append("text")
    .attr("x", (d) => (d.role === "origin" ? d.x0 + 6 : d.x1 + 6))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.role === "origin" ? "end" : "start"))
    .text((d) => (d.name.length > 30 ? `${d.name.slice(0, 27)}...` : d.name))
    .call(
      d3
        .drag()
        .on("start", function (event, d) {
          d3.select(this).raise(); // 提升被拖曳的節點層級
          d3.select(this).attr("cursor", "pointer");
        })
        .on("drag", function (event, d) {
          const dy = event.dy; // 拖曳的垂直位移
          d.y0 += dy; // 更新節點的起始 y 座標
          d.y1 += dy; // 更新節點的結束 y 座標

          // 更新節點位置
          d3.select(this)
            .select("rect")
            .attr("y", d.y0)
            .attr("height", d.y1 - d.y0);

          d3.select(this)
            .select("text")
            .attr("y", (d.y0 + d.y1) / 2);
          ``;
          // 更新連線
          svg.selectAll(".link").attr("d", d3.sankeyLinkHorizontal()); // 動態更新連線路徑
        })

        .on("end", function (event, draggedNode) {
          // 儲存節點的起始與結束位置
          const startY0 = draggedNode.y0 - event.dy; // 起始位置的 y0
          const startY1 = draggedNode.y1 - event.dy; // 起始位置的 y1
          const endY0 = draggedNode.y0; // 結束位置的 y0
          const endY1 = draggedNode.y1; // 結束位置的 y1

          // 遍歷節點，根據拖曳範圍調整相關節點
          graph.nodes.forEach((node) => {
            if (node !== draggedNode) {
              if (startY0 < endY0 && node.y0 >= startY1 && node.y0 <= endY0) {
                // 範圍內的節點需要向上推
                node.y0 -= endY1 - startY1;
                node.y1 = node.y0 + (node.y1 - node.y0);
              } else if (startY0 > endY0 && node.y1 <= endY1) {
                // 範圍內的節點需要向下拉
                node.y0 += startY1 - endY1;
                node.y1 = node.y0 + (node.y1 - node.y0);
              }
            }
          });
          sankey.update(graph); // 使用 sankey 更新節點與連線

          // 更新節點與連線
          svg.selectAll(".link").attr("d", d3.sankeyLinkHorizontal());

          svg
            .selectAll("rect")
            .attr("y", (d) => d.y0)
            .attr("height", (d) => d.y1 - d.y0);

          svg.selectAll("text").attr("y", (d) => (d.y0 + d.y1) / 2);
        })
    );
}

// 建立 Tooltip
function createTooltip() {
  return d3
    .select("body")
    .append("div")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "10px")
    .style("border-radius", "4px")
    .style("font-size", "14px")
    .style("font-family", "Arial")
    .style("pointer-events", "none")
    .style("opacity", 0);
}
