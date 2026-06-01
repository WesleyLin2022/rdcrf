// 在頁面載入時初始化表格
document.addEventListener('DOMContentLoaded', function() {
    initializeTables();
    initializeSelect2();
    setupEventListeners();
	// 檢查登入狀態
});

let field_num = 32;



function initializeSelect2() {
    ['#project1', '#project2'].forEach(selector => {
        $(selector).select2({
            placeholder: '請選擇或輸入專案名稱',
            allowClear: true,
            ajax: {
                url: '/project/searchProjectsId',  // 呼叫後端 API
				dataType: 'json',
				delay: 250,                       // 輸入後延遲 250ms 再發送請求
				data: function(params) {
					return {
						search: params.term       // 傳送輸入文字作為參數 search
					};
				},
				processResults: function(data) {
					return {
						results: data.map(results => ({
							id: results.id,
							text: results.id
						}))
					};
				},
				cache: true
				}
        });
    });
}

function setupEventListeners() {
    // 監聽專案選擇變更
    $('#project1').on('change', () => loadProjectContent(1));
    $('#project2').on('change', () => loadProjectContent(2));

    // 監聽比較按鈕
    document.getElementById('compareBtn').addEventListener('click', compareProjects);
}

function loadProjectContent(projectNum) {
    const projectId = $(`#project${projectNum}`).val();
    if (!projectId) {
        $(`#project${projectNum}Content`).empty();
        updateCompareButtonState();
        return;
    }
    try {
	    fetch('/project/projectData_Query', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({id:projectId})
		})
		.then(res => res.json())
		.then(data => {
			if (data.length > 0){
				displayProjectContent(projectNum, data);
			}
			else {
				showMessage('尚無資料上傳');
			}
		});
	} catch (error) {
		showMessage('系統錯誤，請稍後再試');
		
	}
    
}


function handleCheckboxChange(projectNum, rowIndex) {
    // 取消同一專案其他的選擇
    const checkboxes = document.querySelectorAll(`.project${projectNum}-checkbox`);
    checkboxes.forEach((checkbox, index) => {
        if (index !== rowIndex) {
            checkbox.checked = false;
        }
    });

    updateCompareButtonState();
}

function updateCompareButtonState() {
    const project1Selected = document.querySelector('.project1-checkbox:checked');
    const project2Selected = document.querySelector('.project2-checkbox:checked');
    
    document.getElementById('compareBtn').disabled = !(project1Selected && project2Selected);
}



function getSelectedRow(projectNum) {
    const checkbox = document.querySelector(`.project${projectNum}-checkbox:checked`);
    return checkbox ? checkbox.closest('tr') : null;
}

function resetComparisonState() {
    document.querySelectorAll('.diff-highlight').forEach(element => {
        element.classList.remove('diff-highlight');
    });
}

// ... 其他函數保持不變 ...

function generateTableHeaders() {
    const headers = ['選擇', 'BU', 'Customer', 'Forecast', 'type', 'Platfrom type', 'Antenna Environment', 'Antenna Location',
	                 'Antenna Function', 'SAR', 'Antenna Body' , 'Antenna Cable type', 'Cable Con', 'Antenna Function Description' , 
					 'Antenna body Dimension', 'Antenna Cable Length', 'Antenna grounding size', 
					 'Antenna body have Bracket for ant performance', 'PCB點膠', '環剝下地含導電布', 
					 'Add a Gasket for RF Solution Dimension', 'Teflon', '熱縮套管', '醋酸膠布','機構要求', 'WNC', 'AWAN', 
					 'Inpaq', 'HB', 'HTK', 'Speed', 'Pulse', 'Other'];
    /*for (let i = 1; i <= field_num; i++) {
        headers.push(`欄位${i}`);
    }*/
    return headers;
}

function initializeTables() {
    const headers = generateTableHeaders();
    const tables = document.querySelectorAll('table');
    
    tables.forEach((table, index) => {
		console.log(`index = ${index}`);
        const headerRow = table.querySelector('thead tr');
        headerRow.innerHTML = ''; // 清空現有表頭
        
        headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            if (index < 1) th.className = 'sticky-col';
            headerRow.appendChild(th);
        });
    });
	
}

function displayProjectContent(projectNum, content) {
    const tbody = document.getElementById(`project${projectNum}Content`);
    tbody.innerHTML = '';

    content.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // 添加選擇框和名稱列（固定列）
        const checkboxTd = document.createElement('td');
        checkboxTd.className = 'sticky-col';
        checkboxTd.innerHTML = `
            <input type="checkbox" 
                   class="form-check-input project${projectNum}-checkbox" 
                   data-row-index="${index}"
                   onchange="handleCheckboxChange(${projectNum}, ${index})">
        `;
        tr.appendChild(checkboxTd);

        /*const nameTd = document.createElement('td');
        nameTd.className = 'sticky-col';
        nameTd.textContent = row.name;
        tr.appendChild(nameTd);*/
		let field = [row.bu, row.customer, row.forecast, row.type, row.platform_type, row.Ant_environment, row.Ant_location, 
		             row.Ant_function, row.SAR, row.Ant_body, row.Ant_cable_type, row.Cable_Con, row.Ant_function_description,
					 row.Ant_body_dimension, row.Ant_cable_length, row.Ant_grounding_size_and_AlCu_foil, row.Bracket_for_perf,
					 row.PCB_for_cable_fix, row.conductive_fabric, row.gasket, row.teflon, row.casing, row.tape, row.mech_req,
					 row.wnc, row.awan, row.inpaq, row.hb, row.htk, row.speed, row.pulse, row.other];
        // 添加其他欄位
        for (let i = 0; i < field_num; i++) {
            const td = document.createElement('td');
            td.textContent = field[i] || '';
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });
	
}


function compareProjects() {
    const project1Row = getSelectedRow(1);
    const project2Row = getSelectedRow(2);

    if (!project1Row || !project2Row) return;

    resetComparisonState();

    // 比較所有欄位（跳過選擇框列）
    for (let i = 1; i < project1Row.cells.length; i++) {
        const cell1 = project1Row.cells[i];
        const cell2 = project2Row.cells[i];

        if (cell1.textContent !== cell2.textContent) {
            cell1.classList.add('diff-highlight');
            cell2.classList.add('diff-highlight');
        }
    }
}
