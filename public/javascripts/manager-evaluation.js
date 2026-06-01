document.addEventListener('DOMContentLoaded', function() {
	
	//checkLoginStatus();
    initializeSelect2();
    setupEventListeners();
});
let employeesList = []; // 儲存所有員工資料
checkLoginStatus();

function initializeSelect2() {
    // 初始化部門選擇
    $('#departmentCode').select2({
        placeholder: '請選擇部門'
    });
	//select2 會覆蓋原生的 <select> 元素事件處理方式，所以你不能單純用 addEventListener('change', ...) 綁定原生事件。
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
    //let departmentCode = document.getElementById('departmentCode').value;
	let departmentCode = $('#departmentCode').val();
	
	
    const employeeSelect = $('#employeeId');
    //清空原本的員工選單選項。 加入預設的提示選項：`請選擇員工`。
    employeeSelect.empty().append('<option value="">請選擇員工</option>');
    
	//employeesList 是一個全域的員工資料陣列。
	//如果選取了某個部門（departmentCode 有值），就篩選出 dn（部門代碼）等於 departmentCode 的員工。
	//如果沒選部門，則顯示所有員工。
    const filteredEmployees = (departmentCode == -1)
        ? employeesList
        : employeesList.filter(emp => emp.dn === departmentCode);
		
    /*const filteredEmployees = (departmentCode != -1)
        ? employeesList.filter(emp => emp.dn === target_dn)
        : employeesList;*/
    
    //將篩選後的員工清單逐一加入下拉選單中。
	//每一個參數是選項的內容，是「員工編號」，第二個參數是值，即是員工的 `id`。
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

function test(){
	console.log("1111111111");
}

function setupEventListeners() {
    //document.getElementById('departmentCode').addEventListener('change', test);
    document.getElementById('searchForm').addEventListener('submit', handleSearch);
	document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

function SortByName(data, key){
	//排序從後端資料庫來的KPI陣列,排序為 日常工作項目->AI的工作項目-工作項目->加分工作項目
	const order = { "日常工作項目": 0, "AI的工作項目": 1, "加分工作項目": 2 };
	return data.sort((a, b) => {
		return order[a[key]] - order[b[key]];
	});
}

function handleSearch(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value;
    if (!employeeId) return;
	
	const now_year = new Date().getFullYear();
    let now_month = new Date().getMonth() + 1;
    let month_opt = "";
    if (now_month >= 4 && now_month <=8 ) {
	    month_opt = '年中';
    }
    else {
	    month_opt = '年底';
    }
	
	fetch(`/performance/getKPIbyIDYYMM?id=${employeeId}&year=${now_year}&month=${month_opt}`)
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
				const sortedEvaluations = SortByName(data.records, "type");
                displayEvaluations(sortedEvaluations);
				document.getElementById('evaluationContent').classList.remove('d-none');
            } else {
                showMessage(data.message || '查詢失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
        });

    
}

function displayEvaluations_(evaluations) {
    const tbody = document.getElementById('evaluationList');
    tbody.innerHTML = '';

    evaluations.forEach(evaluation => {
		// 第一列：評核類型、項目要點、分數
		const row1 = document.createElement('tr');
		row1.innerHTML = `
		    <td>${evaluation.type}</td>
			<td>${evaluation.item}</td>
			<td>${evaluation.contribution1}</td>
			<td>${evaluation.contribution2}</td>
			<td>${evaluation.contribution3}</td>
			<td>${evaluation.comment1}</td>
			<td class="content" data-field="s_score" >${evaluation.supervisor_score}</td>
			<td >
			    <button class="btn btn-primary btn-sm" onclick="editEvaluation(${evaluation.serial_number}, this)">
				編輯
				</button>
			</td>
			
		`;
		
		tbody.appendChild(row1);
		
    });
}

function displayEvaluations(evaluations) {
    const tbody = document.getElementById('evaluationList');
    tbody.innerHTML = '';
    

    evaluations.forEach(evaluation => {
        const row = document.createElement('tr');
		
		
        // 根據 comment 值決定是否勾選
        const checked1 = evaluation.comment1 == "1" ? 'checked' : '';
        const checked2 = evaluation.comment2 == "1" ? 'checked' : '';
        const checked3 = evaluation.comment3 == "1" ? 'checked' : '';

        row.innerHTML = `
            <td>${evaluation.type}</td>
            <td>${evaluation.item}</td>
            <td>${evaluation.contribution1}</td>
            <td>${evaluation.contribution2}</td>
            <td>${evaluation.contribution3}</td>
			
            <!-- 新增的評分欄：3個checkbox -->
            <td class="content" data-field="comments">
                <label>①<input type="checkbox" disabled ${checked1}></label>
                <label>②<input type="checkbox" disabled ${checked2}></label>
                <label>③<input type="checkbox" disabled ${checked3}></label>
            </td>

            <!-- 原主管分數欄位移除 -->
            <td>
                <button class="btn btn-primary btn-sm" onclick="editEvaluation(${evaluation.serial_number}, this)">
                    編輯
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function submitScore(SN, button) {
    const row = button.closest('tr');
    const scoreInput = row.querySelector('.score-input');
    const score = scoreInput.value;

    if (!score || score < 0 || score > 5) {
        showMessage('請輸入0-5之間的分數');
        return;
    }
	
	const formData = {
		serial_number:  SN,
		supervisor_score: score
    };
	fetch('/manager/UpdateSScorebySN', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status == 0) {
            showMessage('評分已更新');
        } else {
            showMessage(data.message || '評分更新失敗');
        }
    })
    .catch(error => {
        showMessage('系統錯誤，請稍後再試');
    });
	
}

function editEvaluation___(SN, button) {
	const row = button.closest('tr');
    const isEditing = button.textContent === '確定';
	
	if (isEditing) {
		button.textContent = '編輯';
		
		
		let score_counter = row.querySelector('[data-field="s_score"] input').value;
		
        // 保存修改
        const formData = {
            serial_number: SN,
            comment1: "",
            comment2: "",
            comment3: "",
            supervisor_score: score_counter
        };

        fetch('/performance/updateCommentbySN', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
				showtest();
				
            } else {
                showMessage(data.message || '修改失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
        });
    } else {
        // 進入編輯模式
        row.querySelectorAll('.content').forEach(cell => {
            const field = cell.dataset.field;
            const value = cell.textContent;
            cell.innerHTML = `<input type="text" class="form-control" value="${value}">`;
        });
        button.textContent = '確定';
    }
}

function editEvaluation(SN, button) {
    const row = button.closest('tr');
    const isEditing = button.textContent === '確定';
    const commentCells = row.querySelectorAll('[data-field="comments"] input[type="checkbox"]');

    if (isEditing) {
        // === 點擊「確定」：送出修改 ===
        button.textContent = '編輯';

        // 取得checkbox狀態：勾選="1"、未勾選="0"
        const states = Array.from(commentCells).map(cb => cb.checked ? "1" : "0");

        // 計算勾選數量
        const checkedCount = states.filter(v => v === "1").length;

        // 禁止再編輯
        commentCells.forEach(cb => cb.disabled = true);

        // 建立送出資料
        const formData = {
            serial_number: SN,
            comment1: states[0],
            comment2: states[1],
            comment3: states[2],
            supervisor_score: checkedCount // 勾選幾個即為分數
        };

        // 傳送至後端
        fetch('/performance/updateCommentbySN', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
                showtest(); // 更新成功可重新載入資料或提示
            } else {
                showMessage(data.message || '修改失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
        });

    } else {
        // === 點擊「編輯」：進入可勾選狀態 ===
        commentCells.forEach(cb => cb.disabled = false);
        button.textContent = '確定';
    }
}

//有主管評論的版本使用
function editEvaluation__s(SN, button) {
	const row = button.closest('tr');
    const isEditing = button.textContent === '確定';
	
	if (isEditing) {
		button.textContent = '編輯';
		
		let score_counter = 0;
		let com1 = row.querySelector('[data-field="comment1"] input').value;
		let com2 = row.querySelector('[data-field="comment2"] input').value;
		let com3 = row.querySelector('[data-field="comment3"] input').value;
		
		if (com1.length > 0 ){
			score_counter++;
		}
		else {
			com1 = "";
		}
		if (com2.length > 0 ){
			score_counter++;
		}
		else {
			com2 = "";
		}
		if (com3.length > 0 ){
			score_counter++;
		}
		else {
			com3 = "";
		}
		
        // 保存修改
        const formData = {
            serial_number: SN,
            comment1: com1,
            comment2: com2,
            comment3: com3,
            supervisor_score: score_counter
        };

        fetch('/performance/updateCommentbySN', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
				showtest();
				
            } else {
                showMessage(data.message || '修改失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
        });
    } else {
        // 進入編輯模式
        row.querySelectorAll('.content').forEach(cell => {
            const field = cell.dataset.field;
            const value = cell.textContent;
            cell.innerHTML = `<input type="text" class="form-control" value="${value}">`;
        });
        button.textContent = '確定';
    }
}

function showtest() {
	const employeeId = document.getElementById('employeeId').value;
    if (!employeeId) return;
	
	const now_year = new Date().getFullYear();
    let now_month = new Date().getMonth() + 1;
    let month_opt = "";
    if (now_month >= 5 && now_month <=8 ) {
	    month_opt = '年中';
    }
    else {
	    month_opt = '年底';
    }
	
	fetch(`/performance/getKPIbyIDYYMM?id=${employeeId}&year=${now_year}&month=${month_opt}`)
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
				const sortedEvaluations = SortByName(data.records, "type");
                displayEvaluations(sortedEvaluations);
				document.getElementById('evaluationContent').classList.remove('d-none');
            } else {
                showMessage(data.message || '查詢失敗');
            }
        })
        .catch(error => {
            showMessage('系統錯誤，請稍後再試');
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

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}