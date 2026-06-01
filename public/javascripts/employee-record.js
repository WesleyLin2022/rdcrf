let employeesList = []; // 儲存所有員工資料
// 定義一個全域變數存放當前資料
let currentKpiData = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeSelect2();
    initializeYearSelect();
    setupEventListeners();
	checkLoginStatus();
	
	
	// 🔹 預設顯示 AI評語，隱藏原表格
	$("#multiTableSection").hide();
	$("#resultSection").hide();
	$("#toggleView").text("KPI內容");

	// 🔹 點擊切換顯示區塊
	$("#toggleView").on("click", function(e) {
		e.preventDefault();

		if ($("#multiTableSection").is(":visible")) {
			// 顯示 KPI 表格
			$("#multiTableSection").hide();
			$("#resultSection").removeClass("d-none").show();
			$("#toggleView").text("AI評語");
			//redrawAllCharts();
		} else {
			// 顯示 AI 四表格
			$("#resultSection").hide();
			$("#multiTableSection").show();
			$("#toggleView").text("KPI內容");
		}
	});
    
    // 加入防抖 (Debounce) 處理，避免調整視窗大小時產生效能問題
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentKpiData) {
                console.log("Resizing charts...");
                renderAllCharts(currentKpiData);
            }
        }, 200); // 停止縮放後 200ms 才重新繪圖
    });
});


function initializeSelect2() {
    // 初始化部門選擇
    $('#departmentCode').select2({
        placeholder: '請選擇部門'
    });
	$('#departmentCode').on('change', function () {
        updateEmployeeSelect();
    });

    // 初始化員工選擇
    $('#employeeId').select2({
        placeholder: '請選擇或輸入姓名',
        allowClear: true,
        minimumInputLength: 0,
        matcher: matchEmployee
    });

    // 初始化年度和期間選擇
    $('#year, #period').select2({
        placeholder: '請選擇'
    });
}

function initializeYearSelect() {
    const yearSelect = document.getElementById('year');
    const currentYear = new Date().getFullYear();
	
	for (let i = 2025; i <= currentYear; i++){
	    const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
	}
    
}

function matchEmployee(params, data) {
    if (!params.term) {
        return data;
    }

    const term = params.term.toLowerCase();
    if (data.text.toLowerCase().indexOf(term) > -1 || 
        data.id.toLowerCase().indexOf(term) > -1) {
        return data;
    }

    return null;
}

function loadEmployees(id) {
	fetch(`/manager/getSubordinatesById?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
                employeesList = data.employees.slice();
				initDepartmentCode();
            }
        })
        .catch(error => console.error('Error:', error));
}

function initDepartmentCode() {
	const DepartmentCodeSelect = $('#departmentCode');
	DepartmentCodeSelect.empty();
	DepartmentCodeSelect.append(new Option("請選擇部門代碼", -1, false, false));
	//DepartmentCodeSelect.append('<option value="-1">請選擇部門代碼</option>');
	const dn_list = [...new Set(employeesList.map(employee => employee.dn))];
	
	const dn_list_sorted = dn_list.slice().sort();
	dn_list_sorted.forEach(dn => {
		DepartmentCodeSelect.append(new Option(
		    dn,
			dn,
			false,
			false
		));
	});
	
	//setting employeeId
	const employeeSelect = $('#employeeId');
    //清空原本的員工選單選項。 加入預設的提示選項：`請選擇員工`。
    employeeSelect.empty().append('<option value="">請選擇員工</option>');
	employeesList.forEach(employee => {
        employeeSelect.append(new Option(
            `${employee.id}-${employee.name}`,
            employee.id,
            false,
            false
        ));
    });
}

function updateEmployeeSelect() {
	let departmentCode = document.getElementById('departmentCode').value;
	
	
    const employeeSelect = $('#employeeId');
    //清空原本的員工選單選項。 加入預設的提示選項：`請選擇員工`。
    employeeSelect.empty().append('<option value="">請選擇員工</option>');
    
	//employeesList 是一個全域的員工資料陣列。
	//如果選取了某個部門（departmentCode 有值），就篩選出 dn（部門代碼）等於 departmentCode 的員工。
	//如果沒選部門，則顯示所有員工。
    const filteredEmployees = (departmentCode != -1)
        ? employeesList.filter(emp => emp.dn === departmentCode)
        : employeesList;
    
    //將篩選後的員工清單逐一加入下拉選單中。
	//每個選項的內容是「員工編號」，值則是員工的 `id`。
	//`false, false` 表示該選項不是預設選取也不是 disabled。
    filteredEmployees.forEach(employee => {
        employeeSelect.append(new Option(
            `${employee.id}-${employee.name}`,
            employee.id,
            false,
            false
        ));
    });

    employeeSelect.trigger('change');
}

function setupEventListeners() {
    
    document.getElementById('searchForm').addEventListener('submit', handleSearch2);
	document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

function redrawAllCharts() {
    d3.select('#scoreComparison svg').remove();
    d3.select('#supervisorPieChart svg').remove();
    d3.select('#selfTypeDonut svg').remove();
	d3.select('#selfScoreSingleDonut svg').remove();

    const employeeId = document.getElementById('employeeId').value;
    const year = document.getElementById('year').value;
    const period = document.getElementById('period').value;
	
	try {
	    // 🔹 呼叫後端 API
	    fetch(`/performance/getKPIbyIDYYMM?id=${employeeId}&year=${year}&month=${period}`)
			.then(response => response.json())
			.then(data => {
				if (data.status == 0) {
					const sortedEvaluations = SortByName(data.records, "type");
					// 圖表初始化
					initializeCharts(sortedEvaluations);
				} else {
					showMessage(data.message || '查詢失敗');
				}
			})
			.catch(error => {
				showMessage('系統錯誤，請稍後再試');
			});
		
	} catch (err) {
	    console.error(err);
	    alert("匯出失敗，請檢查後端或網路。--");
	}
}

/**
 * 核心繪圖觸發函式
 * 這個函式只負責兩件事：更新資料快照、執行繪圖
 */
function initializeCharts(records) {
    if (!records || records.length === 0) return;
    // 使用 requestAnimationFrame 取代 setTimeout
    // 這能確保在瀏覽器準備好重繪時執行，效能更好且能確保容器寬高已計算完成
    requestAnimationFrame(() => {
        renderAllCharts(records);
    });
}

/**
 * 封裝所有的 D3 繪圖執行邏輯
 */
function renderAllCharts(data) {
    // 呼叫各個繪圖函式
    createScoreSource(data);
    createSupervisorDonut(data);
    createSelfTypeDonut(data);
    createSelfScoreSingleDonut2(data);
}

function SortByName(data, key){
	//排序從後端資料庫來的KPI陣列,排序為 日常工作項目->AI的工作項目->加分工作項目
	const order = { "日常工作項目": 0, "AI的工作項目": 1, "加分工作項目": 2 };
	return data.sort((a, b) => {
		return order[a[key]] - order[b[key]];
	});
}


async function handleSearch2(e) {
	e.preventDefault();
	
	const id = $("#employeeId").val();
	const year = $("#year").val();
    const month = $("#period").val();
	if (!employeeId || !year || !period) return;
	//console.log(id);
	//console.log(month);
	$("#multiTableSection").hide();
	$("#resultSection").hide();
	$("#toggleView").text("KPI內容");

	try {
	    // 🔹 呼叫後端 API
	    const response = await fetch("/performance/getKPIandComment", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, year, month })
	    });

		if (!response.ok) throw new Error("後端 API 錯誤");
		const { kpis, comment } = await response.json();

		
		currentKpiData = SortByName(kpis, "type");
        displayKpiResults(currentKpiData);
		document.getElementById('resultSection').classList.remove('d-none');
		// 圖表初始化
		initializeCharts(currentKpiData);
		
		$("#multiTableSection").show();
		//console.log(comment);
		displayCommentResults(comment);
		
	} catch (err) {
	    console.error(err);
	    alert("匯出失敗，請檢查後端或網路。--");
	}
	
	function renameHeaders(data, headerMap) {
        return data.map(row => {
            const newRow = {};
            for (const key in headerMap) {
                newRow[headerMap[key]] = row[key];
            }
            return newRow;
        });
    }
}

function displayKpiResults(records) {
    const tbody = document.getElementById('resultList');
    tbody.innerHTML = '';

    records.forEach(record => {
		// 第一列：評核類型、項目要點、分數
		const row1 = document.createElement('tr');
		
		// 根據 comment 值決定是否勾選
        const checked1 = record.comment1 == "1" ? 'checked' : '';
        const checked2 = record.comment2 == "1" ? 'checked' : '';
        const checked3 = record.comment3 == "1" ? 'checked' : '';
		
		// 如果 comment 為 "0" 則標記為特殊樣式
        const style1 = record.comment1 == "0" ? 'special-text' : '';
        const style2 = record.comment2 == "0" ? 'special-text' : '';
        const style3 = record.comment3 == "0" ? 'special-text' : '';
		
		row1.innerHTML = `
		    <td>${record.type}</td>
			<td>${record.item}</td>
			<td class="${style1}">${record.contribution1}</td>
            <td class="${style2}">${record.contribution2}</td>
            <td class="${style3}">${record.contribution3}</td>
			<td class="content" data-field="comments">
                <label>①<input type="checkbox" disabled ${checked1}></label>
                <label>②<input type="checkbox" disabled ${checked2}></label>
                <label>③<input type="checkbox" disabled ${checked3}></label>
            </td>
			<td>${record.supervisor_score}</td>
			
		`;
		tbody.appendChild(row1);
		
		
    });
}

function displayCommentResults(record) {
	
	if (record.length == 0) {
		showMessage('AI評語尚未產生，請稍後再試');
		return;
	}		
	
	//----------dailyWork
    const tbody = document.getElementById('dailyWorkTable');
    tbody.innerHTML = '';
	const row = document.createElement('tr');
	row.innerHTML = `
		<td>${record[0].dailyWorkPros}</td>
		<td>${record[0].dailyWorkCons}</td>
		<td>${record[0].dailyWorkSugg}</td>
	`;
	
    tbody.appendChild(row);
	
	//----------aiWork
	const tbody2 = document.getElementById('aiWorkTable');
    tbody2.innerHTML = '';
	const row2 = document.createElement('tr');
	row2.innerHTML = `
		<td>${record[0].aiWorkPros}</td>
		<td>${record[0].aiWorkCons}</td>
		<td>${record[0].aiWorkSugg}</td>
	`;
	
    tbody2.appendChild(row2);
	
	//----------bonusWork
	const tbody3 = document.getElementById('bonusWorkTable');
    tbody3.innerHTML = '';
	const row3 = document.createElement('tr');
	row3.innerHTML = `
		<td>${record[0].bonusWorkPros}</td>
		<td>${record[0].bonusWorkCons}</td>
		<td>${record[0].bonusWorkSugg}</td>
	`;
	
    tbody3.appendChild(row3);
    
	//----------ai selfEvaluation
	const tbody4 = document.getElementById('selfEvaluationTable');
    tbody4.innerHTML = '';
	const row4 = document.createElement('tr');
	row4.innerHTML = `
		<td>${record[0].selfEvaluation}</td>
	`;
	
    tbody4.appendChild(row4);
	
	//----------ai comment
	const tbody5 = document.getElementById('level1PerformanceTable');
    tbody5.innerHTML = '';
	const row5 = document.createElement('tr');
	row5.innerHTML = `
		<td>${record[0].comment}</td>
	`;
	
    tbody5.appendChild(row5);
	
	
	
}


//createScoreSource 所用 function
function aggregateByType(records) {
    const map = {};

    records.forEach(r => {
        if (!map[r.type]) {
            map[r.type] = {
                type: r.type,
                selfScore: 0,
                managerScore: 0
            };
        }

        map[r.type].selfScore += Number(r.self_score) || 0;
        map[r.type].managerScore += Number(r.supervisor_score) || 0;
    });

    return Object.values(map);
}


// 評分差異分析
function createScoreSource(records) {
    // 清空現有圖表
    d3.select('#scoreComparison').html('');

    // 獲取容器尺寸
    const container = document.getElementById('scoreComparison');
	if (!container) return;
	
	// 設置預設尺寸
    const width = container.clientWidth || 450;  // 預設寬度;
    //const height = 300;  // 固定高度
    const height = container.clientHeight|| 300;
	const margin = { top: 30, right: 150, bottom: 60, left: 60 };
	//console.log(`width = ${width}, height = ${height}`);
	
	// 確保有足夠的繪圖空間
    if (width - margin.left - margin.right < 200) return;  // 空間太小時不繪製

    // 定義評核類型顏色, [0] → 自評（目前註解掉）, [1] → 主管評分
    const typeColors = {
        '日常工作項目': ['#4A90E2', '#357ABD'], 
        'AI的工作項目': ['#7ED321', '#5DAE1F'], 
        '加分工作項目': ['#F5A623', '#D48806']
    };

    // 處理數據
    const data = aggregateByType(records);

    // 創建SVG
    const svg = d3.select('#scoreComparison')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // 設置比例尺
    const x = d3.scaleBand()
        .domain(data.map(d => d.type))
        .range([0, width - margin.left - margin.right])
        .padding(0.3);

    const xSubgroup = d3.scaleBand()
        .domain(['selfScore', 'managerScore'])
        .range([0, x.bandwidth()])
        .padding(0.05);
		
		
	const maxScore = d3.max(data, d =>
		Math.max(d.selfScore, d.managerScore)
	);

	const y = d3.scaleLinear()
		.domain([0, maxScore])
		.nice()
		.range([height - margin.top - margin.bottom, 0]);
    

    // 添加X軸
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');

    // 添加Y軸
    svg.append('g')
        .call(d3.axisLeft(y));

    // 繪製柱狀圖
    const bars = svg.selectAll('.bar-group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .attr('transform', d => `translate(${x(d.type)},0)`);

    // 繪製自評分數柱狀
    bars.append('rect')
		.attr('class', 'self-score')
		.attr('x', d => xSubgroup('selfScore'))
		.attr('y', d => y(d.selfScore))
		.attr('width', xSubgroup.bandwidth())
		.attr('height', d => height - margin.top - margin.bottom - y(d.selfScore))
		.attr('fill', d => typeColors[d.type][0]);


    // 繪製主管評分柱狀
    bars.append('rect')
	    .attr('class', 'manager-score')  // 添加類別
        .attr('x', d => xSubgroup('managerScore'))
        .attr('y', d => y(d.managerScore))
        .attr('width', xSubgroup.bandwidth())
        .attr('height', d => height - margin.top - margin.bottom - y(d.managerScore))
        .attr('fill', d => typeColors[d.type][1]);

    // 添加圖例
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width  - margin.right + 20}, 10)`);

    // 評核類型圖例
    const types = {
        '日常工作項目': '日常',
        'AI的工作項目': 'AI',
        '加分工作項目': '加分'
    };

    Object.entries(types).forEach(([type, label], i) => {
        const legendGroup = legend.append('g')
            .attr('transform', `translate(0, ${i * 60})`);

        // 自評分數圖例
        legendGroup.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', typeColors[type][0]);

        legendGroup.append('text')
            .attr('x', 18)
            .attr('y', 10)
			.style('font-size', '12px')  // 調整文字大小
            .text(`${label}-自評`);

        // 主管評分圖例
        legendGroup.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('y', 25)
            .attr('fill', typeColors[type][1]);

        legendGroup.append('text')
            .attr('x', 18)
            .attr('y', 35)
			.style('font-size', '12px')  // 調整文字大小
            .text(`${label}-主管評`);
    });

    // 添加響應式調整
    function resize() {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight || 300;

        svg.attr('width', newWidth)
           .attr('height', newHeight);

        x.range([0, newWidth - margin.left - margin.right]);
        xSubgroup.range([0, x.bandwidth()]);

        // 更新所有元素的位置
        svg.selectAll('.bar-group')
           .attr('transform', d => `translate(${x(d.item)},0)`);
		   
		// 修正這裡的矩形更新代碼
        svg.selectAll('.bar-group').selectAll('rect')
            .attr('x', function() {
                const parentData = d3.select(this.parentNode).datum();
                return this.classList.contains('self-score') ? 
                    xSubgroup('selfScore') : 
                    xSubgroup('managerScore');
            })
            .attr('width', xSubgroup.bandwidth());

        // 更新軸
        svg.select('.x-axis')
           .call(d3.axisBottom(x));

        // 更新圖例位置
        legend.attr('transform', `translate(${newWidth - margin.right + 20}, 10)`);
    }
}

//createSupervisorDonut() 所用 function
function aggregateSupervisorScore(records) {
    const map = {};

    records.forEach(r => {
        if (!map[r.type]) {
            map[r.type] = {
                type: r.type,
                value: 0
            };
        }
        map[r.type].value += Number(r.supervisor_score) || 0;
    });

    return Object.values(map);
}

//主管評分分析
function createSupervisorDonut(records) {
    d3.select('#supervisorPieChart').html('');

    const container = document.getElementById('supervisorPieChart');
    if (!container) return;

    const width = container.clientWidth || 450;
    //const height = 350;
	const height = container.clientHeight|| 300;
    const radius = Math.min(width, height) / 2 - 20;

    const data = aggregateSupervisorScore(records);
    const total = d3.sum(data, d => d.value);

    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.type))
        .range(['#357ABD', '#5DAE1F', '#D48806']);

    const svg = d3.select('#supervisorPieChart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // 主圖群組（左）
    const chartGroup = svg.append('g')
        .attr('transform', `translate(${width * 0.3}, ${height / 2})`);

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)   // 甜甜圈厚度
        .outerRadius(radius);

    const arcs = chartGroup.selectAll('arc')
        .data(pie(data))
        .enter()
        .append('g');

    // 甜甜圈區塊
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.type))
        .attr('stroke', '#fff')
        .style('stroke-width', '2px');
	// 百分比文字 (滑鼠移動到圖形上會顯示文字) 
    arcs.append('title')
        .text(d => `${d.data.type}: ${d.data.value}`);
	

    // 中央總分
    chartGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(total);

    chartGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('主管評分總分');

    // ---------- 右側圖例 ----------
    const legend = svg.append('g')
        .attr('transform', `translate(${width * 0.6}, ${height / 2 - 60})`);

    data.forEach((d, i) => {
        const percent = ((d.value / total) * 100).toFixed(1);

        const row = legend.append('g')
            .attr('transform', `translate(0, ${i * 30})`);

        row.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', color(d.type));

        row.append('text')
            .attr('x', 22)
            .attr('y', 12)
            .style('font-size', '13px')
            .text(`${d.type} (${percent}%)`);
    });
}

// createSelfTypeDonut() 所用 function
function aggregateSelfScoreByType(records) {
    const map = {};

    records.forEach(r => {
        if (!map[r.type]) {
            map[r.type] = {
                type: r.type,
                value: 0
            };
        }
        map[r.type].value += Number(r.self_score) || 0;
    });

    return Object.values(map);
}

// 員工自評分數分析
function createSelfTypeDonut(records) {
    d3.select('#selfTypeDonut').html('');

    const container = document.getElementById('selfTypeDonut');
    if (!container) return;

    const width = container.clientWidth || 450;
    const height = container.clientHeight || 300;
	const radius = Math.min(width, height) / 2 - 20;

    const data = aggregateSelfScoreByType(records);
    const total = d3.sum(data, d => d.value);

    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.type))
        .range(['#4A90E2', '#7ED321', '#F5A623']); 
        // 與你原本「自評」顏色一致

    const svg = d3.select('#selfTypeDonut')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // 左側甜甜圈
    const chartGroup = svg.append('g')
        .attr('transform', `translate(${width * 0.3}, ${height / 2})`);

    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius);

    const arcs = chartGroup.selectAll('arc')
        .data(pie(data))
        .enter()
        .append('g');

    // 區塊
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.type))
        .attr('stroke', '#fff')
        .style('stroke-width', '2px');
	
	// 百分比文字 (滑鼠移動到圖形上會顯示文字) 
    arcs.append('title')
        .text(d => `${d.data.type}: ${d.data.value}`);

    // 中央總分
    chartGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(total);

    chartGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('自評總分');

    // ---------- 右側圖例 ----------
    const legend = svg.append('g')
        .attr('transform', `translate(${width * 0.6}, ${height / 2 - 60})`);

    data.forEach((d, i) => {
        const percent = ((d.value / total) * 100).toFixed(1);

        const row = legend.append('g')
            .attr('transform', `translate(0, ${i * 30})`);

        row.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', color(d.type));

        row.append('text')
            .attr('x', 22)
            .attr('y', 12)
            .style('font-size', '13px')
            .text(`${d.type} (${percent}%)`);
    });
}

// 自評設定完成度使用的函式
function buildSingleDonutData(records) {
	const MAX_SCORE = 9;

	const types = [
		'日常工作項目',
		'AI的工作項目',
		'加分工作項目'
	];
	
    const scoreMap = d3.rollup(
        records,
        v => d3.sum(v, d => Number(d.self_score || 0)),
        d => d.type
    );

    const pieData = [];

    types.forEach(type => {
        const used = Math.min(scoreMap.get(type) || 0, MAX_SCORE);
        const unused = MAX_SCORE - used;

        pieData.push(
            { type, label: 'used', value: used },
            { type, label: 'unused', value: unused }
        );
    });
	//console.log(pieData);
    return pieData;
}

// 自評設定完成度
function createSelfScoreSingleDonut2(records) {
    const container = document.getElementById('selfScoreSingleDonut');
    if (!container) return;

    d3.select(container).html('');
	
	const types = [
		'日常工作項目',
		'AI的工作項目',
		'加分工作項目'
	];
	
	const typeColors = {
		'日常工作項目': '#4A90E2',
		'AI的工作項目': '#7ED321',
		'加分工作項目': '#F5A623'
	};

	/*const unusedColors = {
		'日常工作項目': '#7B7B7B',
		'AI的工作項目': '#ADADAD',
		'加分工作項目': '#D0D0D0'
	};*/
	
	const unusedColors = {
		'日常工作項目': '#ACD6FF',
		'AI的工作項目': '#BBFFBB',
		'加分工作項目': '#FFD1A4'
	};

    const width = container.clientWidth || 450;
    const height = container.clientHeight || 300;
	const radius = Math.min(width, height) / 2 - 20;
	//console.log('width:', width, 'height:', height, 'radius:', radius);
    // 整體 SVG（包含 donut + legend）
	const svg = d3.select(container)
		.append('svg')
		.attr('width', width)
		.attr('height', height);

	// donut 區
	
	const donutGroup = svg.append('g')
	    .attr('transform', `translate(${width * 0.3}, ${height / 2})`);

    /* ===== 資料 ===== */
    const data = buildSingleDonutData(records);

    /* ===== Pie（順序固定，確保每類 120°） ===== */
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius);

    /* ===== 繪製 ===== */
    donutGroup.selectAll('path')
        .data(pie(data))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d =>
            d.data.label === 'used'
                ? typeColors[d.data.type]
                : unusedColors[d.data.type]
        )
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    /* ===== 類型標籤（放在每個 120° 中心） ===== */
    const typeCenters = [];
    let angle = 0;

    types.forEach(type => {
        const startAngle = angle;
        const endAngle = angle + (2 * Math.PI / 3);
        typeCenters.push({
            type,
            angle: (startAngle + endAngle) / 2
        });
        angle = endAngle;
    });

    

    /* ===== 中央文字 ===== */
    const totalUsed = d3.sum(
        data.filter(d => d.label === 'used'),
        d => d.value
    );

    donutGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(`${totalUsed}/27`);

    donutGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('自評/總分');
		
    // ---------- 右側圖例 ----------
	
	const scoreSummary = {
		'日常工作項目': { used: data[0].value, unused: data[1].value },
		'AI的工作項目': { used: data[2].value, unused: data[3].value },
		'加分工作項目': { used: data[4].value, unused: data[5].value }
	};

	
	const legendData = [
		{ title: '已設定', items: types.map(t => ({
			label: t,
			color: typeColors[t],
			value: scoreSummary[t].used
		}))},
		{ title: '未設定', items: types.map(t => ({
			label: t,
			color: unusedColors[t],
			value: scoreSummary[t].unused
		}))}
	];

	
	const legendGroup = svg.append('g')
	    .attr('transform', `translate(${width * 0.6}, ${height / 2 - 80})`);

	let yOffset = 0;

	legendData.forEach(group => {
		// 標題
		legendGroup.append('text')
			.attr('x', 0)
			.attr('y', yOffset)
			.style('font-size', '13px')
			.style('font-weight', '600')
			.text(group.title);

		yOffset += 10;

		group.items.forEach(item => {
			// 色塊
			legendGroup.append('rect')
				.attr('x', 0)
				.attr('y', yOffset)
				.attr('width', 10)
				.attr('height', 10)
				.attr('rx', 2)
				.attr('fill', item.color);

			// 文字
			legendGroup.append('text')
				.attr('x', 16)
				.attr('y', yOffset + 9)
				.style('font-size', '12px')
				.style('fill', '#333')
				.text(`${item.label.replace('工作項目', '')}：${item.value}項`);
				
		    

			yOffset += 18;
		});

		yOffset += 10; // 區塊間距
	});

}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
    } else {
        fetch('/member/checkId', {
            headers: { 'Authorization': token }
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
				//console.log(`get user id is ${data.user.id}`);
                document.getElementById('userId').textContent = `${data.user.id}`;
				loadEmployees(data.user.id);
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
}

function createTypeAnalysis(records) {
    // 清空現有圖表
    d3.select('#typeAnalysis').html('');

    // 獲取容器尺寸
    const container = document.getElementById('typeAnalysis');
	if (!container) return;
	
	// 設置預設尺寸
    const width = container.clientWidth || 800;  // 預設寬度;
    const height = 300;  // 固定高度
    const margin = { top: 30, right: 150, bottom: 60, left: 60 };
	//console.log(`width = ${width}, height = ${height}`);
	
	// 確保有足夠的繪圖空間
    if (width - margin.left - margin.right < 200) return;  // 空間太小時不繪製
	
	// 資料前處理：統計每個類型的出現次數
    const typeCounts = d3.rollup(
        records,
        v => v.length,
        d => d.type
    );
	
	const pieData = Array.from(typeCounts, ([type, count]) => ({ type, count }));
	const total = d3.sum(pieData, d => d.count);
	
	// 圖表尺寸與顏色設定
    const radius = Math.min(width, height) / 2;
	// 固定類型順序
    const typeOrder = ["日常工作項目", "AI的工作項目", "加分工作項目"];
	// 固定顏色對應每個類型
	const color = d3.scaleOrdinal()
        .domain(typeOrder)
        .range(["#4A90E2", "#7ED321", "#F5A623"]);

    // 創建SVG
    const svg = d3.select('#typeAnalysis')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);	

    const pie = d3.pie()
        .sort(null)
        .value(d => d.count);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius - 10);
		
    const pieArcs = pie(pieData);
    
	// 繪製區塊
	const arcs = svg.selectAll("path")
        .data(pieArcs)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.type))
        .attr("stroke", "#fff")
        .attr("stroke-width", "2px");
	
	// 顯示百分比文字
    svg.selectAll("text")
        .data(pieArcs)
        .enter()
        .append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "14px")
        .style("fill", "#fff")
        .text(d => `${Math.round((d.data.count / total) * 100)}%`);
	
	// 加上圖例
    const legend = d3.select("#typeAnalysis")
        .append("div")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("margin-top", "10px");

    pieData.forEach(d => {
        const item = legend.append("div")
            .style("margin", "0 10px")
            .style("display", "flex")
            .style("align-items", "center");

        item.append("div")
            .style("width", "12px")
            .style("height", "12px")
            .style("background-color", color(d.type))
            .style("margin-right", "6px");

    item.append("span").text(`${d.type}`);
	});
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}