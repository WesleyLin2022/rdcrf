// 在頁面載入時初始化表格
document.addEventListener('DOMContentLoaded', function() {
    initializeTables();
    initializeSelect2();
    setupEventListeners();
	// 檢查登入狀態
    checkLoginStatus();
	// 處理登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

let field_num = 14;

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
				//console.log(data.user);
                document.getElementById('userId').textContent = `${data.user.id}`;
				
			    
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

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
	// 同步水平滾動
    syncHorizontalScroll();
}

function loadProjectContent(projectNum) {
    const projectId = $(`#project${projectNum}`).val();
    if (!projectId) {
        $(`#project${projectNum}Content`).empty();
        updateCompareButtonState();
        return;
    }
    try {
	    fetch('/project/projectNreCost_Query', {
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
				//show title
				let title = document.getElementById(`project${projectNum}Title`);
                title.textContent = `專案${projectNum}: ${projectId}`;
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
    const headers = ['選擇', 'USIM', 'ESIM', 'OTA (5GNR)', 'OTA (LTE)', 'Japan NFC RSE pre-test', 'WLAN DYN Antenna Peak Gain',
	                 'Enhance Device Mode', 'BT DYN Antenna Peak Gain', 'WIFI OTA', 'WIFI 6E (OTA)' , 'WWAN TAS PWR Measurement', 
					 'CM05 WiFi 6E T-put', 'CM05 WiFi 7 T-put', 'Bluetooth Audio test'];
    /*for (let i = 1; i <= field_num; i++) {
        headers.push(`欄位${i}`);
    }*/
    return headers;
}

function initializeTables() {
    const headers = generateTableHeaders();
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
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
	//console.log(content);
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
		let field = [row.usim, row.esim, row.ota_5gnr, row.ota_lte, row.japan_nfc, row.wlan_peak_gain, row.enhance_mode, 
		             row.bt_peak_gain, row.wifi_ota, row.wifi_6e_ota, row.tas_pwr, row.wifi_6e_tput, row.wifi_7_tput,
					 row.bt_audio_test];
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

function syncHorizontalScroll() {
    const wrappers = document.querySelectorAll('.table-wrapper');
    if (wrappers.length < 2) return;

    const [wrapper1, wrapper2] = wrappers;
    let isSyncing = false;

    wrapper1.addEventListener('scroll', () => {
        if (!isSyncing) {
            isSyncing = true;
            wrapper2.scrollLeft = wrapper1.scrollLeft;
            isSyncing = false;
        }
    });

    wrapper2.addEventListener('scroll', () => {
        if (!isSyncing) {
            isSyncing = true;
            wrapper1.scrollLeft = wrapper2.scrollLeft;
            isSyncing = false;
        }
    });
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}
