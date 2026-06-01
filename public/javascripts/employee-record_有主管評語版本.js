document.addEventListener('DOMContentLoaded', function() {
    initializeSelect2();
    initializeYearSelect();
    //loadEmployees();
    setupEventListeners();
});

let employeesList = []; // 儲存所有員工資料
checkLoginStatus();

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
    
    document.getElementById('searchForm').addEventListener('submit', handleSearch);
	document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// 在頁面載入完成後再初始化圖表
function initializeCharts(records) {
    // 等待 DOM 完全載入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
		    setTimeout(() => createScoreSource(records), 100)
			//setTimeout(() => createTypeAnalysis(records), 100)
		});
    } else {
        setTimeout(() => createScoreSource(records), 100);
		//setTimeout(() => createTypeAnalysis(records), 100)
    }
}

function SortByName(data, key){
	//排序從後端資料庫來的KPI陣列,排序為 日常工作項目->AI工作項目->加分工作項目
	const order = { "日常工作項目": 0, "AI工作項目": 1, "加分工作項目": 2 };
	return data.sort((a, b) => {
		return order[a[key]] - order[b[key]];
	});
}

function handleSearch(e) {
    e.preventDefault();
	const employeeId = document.getElementById('employeeId').value;
    const year = document.getElementById('year').value;
    const period = document.getElementById('period').value;
	
	

    if (!employeeId || !year || !period) return;
	
	fetch(`/performance/getKPIbyIDYYMM?id=${employeeId}&year=${year}&month=${period}`)
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
				const sortedEvaluations = SortByName(data.records, "type");
                displayResults(sortedEvaluations);
				document.getElementById('resultSection').classList.remove('d-none');
				// 使用新的初始化函數
                initializeCharts(sortedEvaluations);
            } else {
                showMessage(data.message || '查詢失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
        });
	
}

function displayResults(records) {
    const tbody = document.getElementById('resultList');
    tbody.innerHTML = '';

    records.forEach(record => {
		// 第一列：評核類型、項目要點、分數
		const row1 = document.createElement('tr');
		row1.innerHTML = `
		    <td rowspan="2">${record.type}</td>
			<td rowspan="2">${record.item}</td>
			<td>${record.contribution1}</td>
			<td>${record.contribution2}</td>
			<td>${record.contribution3}</td>
			<td>${record.self_score}</td>
			
		`;
		// 第二列：具體貢獻與主管評語
		const row2 = document.createElement('tr');
		row2.innerHTML = `
            <td class="content" data-field="comment1" >${record.comment1 || ''}</td>
		    <td class="content" data-field="comment2" >${record.comment2 || ''}</td>
            <td class="content" data-field="comment3" >${record.comment3 || ''}</td>
			<td>${record.supervisor_score}</td>
		`;
		tbody.appendChild(row1);
		tbody.appendChild(row2);
		
    });
}

function createCharts(records) {
    //createScoreTrend2(records);
    //createScoreDistribution(records);
    //createSkillRadar(records);
    createScoreSource(records);
}

function createScoreTrend2(records) {
	const data = [
      { type: "A", item: "項目一", selfScore: 7, managerScore: 6 },
      { type: "B", item: "項目二", selfScore: 8, managerScore: 5 },
      { type: "C", item: "項目三", selfScore: 6, managerScore: 7 },
      { type: "A", item: "項目四", selfScore: 9, managerScore: 8 },
      { type: "B", item: "項目五", selfScore: 5, managerScore: 6 },
    ];

    // 動態取得容器寬度
    const container = d3.select("#scoreTrend");
    //const containerWidth = container.node().getBoundingClientRect().width;
	
	const containerWidth = (window.innerWidth > 550) ? 550 : window.innerWidth;
    const aspectRatio = 0.6; // 可調整比例，例如 0.6 表示高為寬的 60%

    const margin = { top: 40, right: 20, bottom: 60, left: 40 },
          width = containerWidth - margin.left - margin.right,
          height = containerWidth * aspectRatio - margin.top - margin.bottom;

    console.log(`containerWidth = ${window.innerWidth}`);
    // 在指定的 div 中建立 svg
    const svg = d3.select("#scoreTrend")
      .append("svg")
      .attr("width", containerWidth)
      .attr("height", containerWidth * aspectRatio)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const typeColor = d3.scaleOrdinal()
      .domain(["A", "B", "C"])
      .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

    const x0 = d3.scaleBand()
      .domain(data.map(d => d.item))
      .range([0, width])
      .paddingInner(0.2);

    const x1 = d3.scaleBand()
      .domain(["selfScore", "managerScore"])
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const y = d3.scaleLinear()
      .domain([0, 10])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x0));

    svg.append("g")
      .call(d3.axisLeft(y));

    svg.selectAll(".bar-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("transform", d => `translate(${x0(d.item)},0)`)
      .selectAll("rect")
      .data(d => [
        { key: "selfScore", value: d.selfScore, type: d.type },
        { key: "managerScore", value: d.managerScore, type: d.type }
      ])
      .enter()
      .append("rect")
      .attr("x", d => x1(d.key))
      .attr("y", d => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", d => typeColor(d.type));

    const legend = svg.selectAll(".legend")
      .data(typeColor.domain())
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(${i * 100}, -20)`);

    legend.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => typeColor(d));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(d => `類型 ${d}`);
}

function createScoreTrend(records) {
    // 評分趨勢分析圖表實現
	console.log("aaaaaaa");
    const width = document.getElementById('scoreTrend').clientWidth;
    const height = 300;
    const margin = {top: 20, right: 30, bottom: 30, left: 40};

    const svg = d3.select('#scoreTrend')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
		.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 在這裡實現折線圖
	const typeColor = d3.scaleOrdinal()
      .domain(["日常工作項目", "AI工作項目", "加分工作項目"])
      .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);
	
	const x0 = d3.scaleBand()
      .domain(records.map(d => d.item))
      .range([0, width])
      .paddingInner(0.2);

    const x1 = d3.scaleBand()
      .domain(["自我評分", "主管評分"])
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const y = d3.scaleLinear()
      .domain([0, 5])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x0));

    svg.append("g")
      .call(d3.axisLeft(y));

    svg.selectAll(".bar-group")
      .data(records)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("transform", d => `translate(${x0(d.item)},0)`)
      .selectAll("rect")
      .data(d => [
        { key: "自我評分", value: d.self_score, type: d.type },
        { key: "主管評分", value: d.supervisor_score, type: d.type }
      ])
      .enter()
      .append("rect")
      .attr("x", d => x1(d.key))
      .attr("y", d => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", d => typeColor(d.type));

    const legend = svg.selectAll(".legend")
      .data(typeColor.domain())
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(${i * 100}, -20)`);

    legend.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => typeColor(d));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(d => `類型 ${d}`);
}

function createScoreDistribution(records) {
    // 評分分布比較圖表實現
    const width = document.getElementById('scoreDistribution').clientWidth;
    const height = 400;
    const margin = {top: 20, right: 30, bottom: 30, left: 40};

    const svg = d3.select('#scoreDistribution')
        .html('')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // 在這裡實現直方圖
}

function createSkillRadar(records) {
    // 能力雷達圖實現
    const width = document.getElementById('skillRadar').clientWidth;
    const height = 300;
    const margin = {top: 20, right: 30, bottom: 30, left: 40};

    const svg = d3.select('#skillRadar')
        .html('')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // 在這裡實現雷達圖
}

function createScoreSource(records) {
    // 清空現有圖表
    d3.select('#scoreSource').html('');

    // 獲取容器尺寸
    const container = document.getElementById('scoreSource');
	if (!container) return;
	
	// 設置預設尺寸
    const width = container.clientWidth || 800;  // 預設寬度;
    const height = 300;  // 固定高度
    const margin = { top: 30, right: 150, bottom: 60, left: 60 };
	console.log(`width = ${width}, height = ${height}`);
	
	// 確保有足夠的繪圖空間
    if (width - margin.left - margin.right < 200) return;  // 空間太小時不繪製

    // 定義評核類型顏色
    const typeColors = {
        '日常工作項目': ['#ff7f0e', '#ffd700'], 
        'AI工作項目': ['#2ca02c', '#98fb98'], 
        '加分工作項目': ['#d62728', '#ff9999']
    };

    // 處理數據
    const data = records.map(record => ({
        type: record.type,
        item: record.item,
        selfScore: record.self_score,
        managerScore: record.supervisor_score
    }));

    // 創建SVG
    const svg = d3.select('#scoreSource')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // 設置比例尺
    const x = d3.scaleBand()
        .domain(data.map(d => d.item))
        .range([0, width - margin.left - margin.right])
        .padding(0.3);

    const xSubgroup = d3.scaleBand()
        .domain(['selfScore', 'managerScore'])
        .range([0, x.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, 5])
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
        .attr('transform', d => `translate(${x(d.item)},0)`);

    // 繪製自評分數柱狀
    bars.append('rect')
	    .attr('class', 'self-score')  // 添加類別
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
        'AI工作項目': 'AI',
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

    // 監聽視窗大小變化
    window.addEventListener('resize', resize);
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

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}