let employeesList = []; // 儲存所有員工資料
let availablePeers = [];
checkLoginStatus();

document.addEventListener('DOMContentLoaded', function() {
    initializeSelect2();
    setupEventListeners();
});

function initializeSelect2() {
    // 初始化部門選擇
    $('#departmentCode').select2({
        placeholder: '請選擇部門',
        allowClear: true
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
        matcher: matchCustom
    });
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

function loadEmployees(id) {
    fetch(`/manager/getSubordinatesById?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.status == 0) {
                employeesList = data.employees.slice().filter(emp => emp.id !== id);
				availablePeers = data.employees.slice();
                updateEmployeeSelect();
				updateDepartmentSelect();
            }
        })
        .catch(error => console.error('Error:', error));
}


function updateDepartmentSelect() {
	//console.log(`updateDepartmentSelect`);
    const departments = [...new Set(employeesList.map(emp => emp.dn))];
    const departmentSelect = $('#departmentCode');
    
    departments.forEach(dept => {
        departmentSelect.append(new Option(dept, dept, false, false));
    });
}

function updateEmployeeSelect() {
    const departmentCode = document.getElementById('departmentCode').value;
    const employeeSelect = $('#employeeId');
    
    employeeSelect.empty().append('<option value="">請選擇員工</option>');

    const filteredEmployees = (departmentCode != -1)
        ? employeesList.filter(emp => emp.dn === departmentCode)
        : employeesList;

    filteredEmployees.forEach(employee => {
        employeeSelect.append(new Option(
            `${employee.id} - ${employee.name}`,
            employee.id,
            false,
            false
        ));
    });
}

function setupEventListeners() {
    
    document.getElementById('searchForm').addEventListener('submit', handleSearch);
	document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

function handleSearch(e) {
    e.preventDefault();
    
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

    //更新評分者list, 自己不能評分自己
	availablePeers = availablePeers.filter(peer => peer.id !== employeeId);
	
    // 發送第一個請求：取得評核資料
	const xhr1 = new XMLHttpRequest();
	xhr1.open('GET', `/performance/getKPIbyIDYYMM?id=${employeeId}&year=${now_year}&month=${month_opt}`);
	xhr1.onreadystatechange = function () {
	    if (xhr1.readyState === 4) {
            if (xhr1.status === 200) {
                try {
					//console.log(xhr1);
				    const evalData = JSON.parse(xhr1.responseText);
					//console.log(evalData);
					if ( evalData.status != 0 ) {
						console.error('Invalid evaluation data');
						return;
					}
                    
					// 顯示第一個區塊
                    displayEvaluations(evalData.records);
                    document.getElementById('evaluationContent').classList.remove('d-none');
                    // 蒐集 evaluationId，並發送多個請求
					const evaluationSNs = evalData.records.map(e => e.serial_number);
                    let completed = 0;
					const allDetails = [];
					
					if (evaluationSNs.length === 0) {
						// 沒有要請求的細節，直接顯示空區塊
						displayEvaluationDetails([]);
						document.getElementById('peerSettings').classList.remove('d-none');
						return;
					}
					
			        evaluationSNs.forEach(function (sn, index) {
					    const xhr2 = new XMLHttpRequest();
					    xhr2.open('GET', `/performance/getPeerRecordBySN?kpisn=${sn}`);
					    xhr2.onreadystatechange = function () {
						    if (xhr2.readyState === 4) {
							    if (xhr2.status === 200) {
								    try {
									    const PeerRecords = JSON.parse(xhr2.responseText);
									    if (PeerRecords.status == 0) {
										    //allDetails[index] = PeerRecords.results; // 保持順序
											if (PeerRecords.results.length != 0) {
												PeerRecords.results.forEach(result => {
													allDetails.push(result);
												});
											}
									    }
								    } catch (err) {
									    console.error('Invalid detail response for ID:', sn);
									    //allDetails[index] = { error: true };
								    }
							    } else {
								    console.error('Detail request failed for ID:', sn);
								    //allDetails[index] = { error: true };
							    }
								
							    completed++;
							    if (completed === evaluationSNs.length) {
								    // 所有第二層請求完成
								    displayPeerSettings(allDetails);
								    //console.log(allDetails);
								    document.getElementById('peerSettings').classList.remove('d-none');
							    }
						    }//end of if xhr2.readyState === 4
					    };
					    xhr2.send();
					});
				}catch(err){
					console.error('Error parsing evaluation response:', err);
				}
			}//end of if xhr1.status === 200
			else {
				console.error('Evaluation request failed:', xhr1.status);
			}
		}//end of if xhr1.readyState === 4
	};
	xhr1.send();
	
}

function displayEvaluations(evaluations) {
    const container = document.getElementById('evaluationList');
    container.innerHTML = '';

    evaluations.forEach(evaluation => {
		const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${evaluation.type}</td>
            <td>${evaluation.item}</td>
            <td>${evaluation.contribution1}</td>
            <td>${evaluation.contribution2}</td>
            <td>${evaluation.contribution3}</td>
            
            <td>
                <select class="form-control peer-select" id="${evaluation.serial_number}" style="width 170px">
                    <option value="-1">請選擇評分者</option>
                    ${availablePeers.map(peer => 
                        `<option value="${peer.id}">${peer.id} - ${peer.name}</option>`
                    ).join('')}
                </select>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" 
                        onclick="addPeerEvaluation(${evaluation.serial_number}, this)">
                    新增
                </button>
            </td>
        `;
        container.appendChild(tr);
		
		// 初始化評分者選擇
        $(tr).find('.peer-select').select2({
			width: '170px',
            placeholder: '請選擇評分者',
            allowClear: true,
            minimumInputLength: 0,
            matcher: matchCustom
        });
		
        /*const div = document.createElement('div');
        div.className = 'evaluation-item';
		
        div.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-1">${evaluation.type}</div>
                <div class="col-md-2">${evaluation.item}</div>
				<div class="col-md-2">${evaluation.contribution1}</div>
				<div class="col-md-2">${evaluation.contribution2}</div>
				<div class="col-md-2">${evaluation.contribution3}</div>
                <div class="col-md-3">
                    <select class="form-control peer-select" data-evaluation-id="${evaluation.id}">
                        <option value="">請選擇評分者</option>
                        ${availablePeers.map(peer => 
                            `<option value="${peer.id}">${peer.id} - ${peer.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-1">
                    <button class="btn btn-primary btn-sm w-100" 
                            onclick="addPeerEvaluation('${evaluation.id}', this)">
                        加入
                    </button>
                </div>
            </div>
        `;
		
        container.appendChild(div);

        // 初始化評分者選擇
        $(div).find('.peer-select').select2({
            placeholder: '請選擇評分者',
            allowClear: true,
            minimumInputLength: 1,
            matcher: matchCustom
        });*/
    });
}

function displayPeerSettings(settings) {
	//settings is a 1D array
    const container = document.getElementById('peerList');
    container.innerHTML = '';
	//console.log(settings);
    let peer_records = [];
	let completed = 0;
    settings.forEach(setting => {
		//console.log(setting);
		const xhr1 = new XMLHttpRequest();
		xhr1.open('GET', `/performance/getKPIbySN?sn=${setting.kpi_sn}`);
		xhr1.onreadystatechange = function () {
			if (xhr1.readyState === 4) {
				if (xhr1.status === 200) {
					try {
						const KPIData = JSON.parse(xhr1.responseText);
						
						if ( KPIData.status != 0 ) {
							console.error('Invalid KPIData data');
							return;
						}
						peer_records.push({'kpi_sn':setting.kpi_sn, 'type':KPIData.results[0].type, 'item':KPIData.results[0].item, 'rater_name':setting.name, 'rater_id':setting.rater_id});
						completed++;
						
						if (completed === settings.length) {
							const sorteds = peer_records.slice().sort((a, b) => a.kpi_sn - b.kpi_sn);
							//console.log(sorted);
							sorteds.forEach( sorted => {
								const tr = document.createElement('tr');
								tr.innerHTML = `
									<td>${sorted.type}</td>
									<td>${sorted.item}</td>
									<td>${sorted.rater_name}</td>
									<td>
										<button class="btn btn-danger btn-sm delete-btn" 
										onclick="deletePeerEvaluation(${sorted.kpi_sn}, ${sorted.rater_id})">刪除
										</button>
									</td>
								`;
								container.appendChild(tr);
							});
							
						}
						
					}catch(err){
						console.error('Error getKPIbySN response:', err);
					}
				}//end of if (xhr1.status === 200)
				else {
					console.error('KPIData request failed:', xhr1.status);
				}
			}//end of if xhr1.readyState === 4
		};
		xhr1.send();
		
    });
	//console.log(peer_records);
	
	
}

function addPeerEvaluation(kpiSN, button) {
	const peerId = document.getElementById(`${kpiSN}`).value;

    if (!peerId || peerId == -1) {
        alert('請選擇評分者');
        return;
    }
	//console.log(peerId);
	
    fetch('/peer/addPeerEvaluation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            kpi_sn: kpiSN,
            rater_id: peerId
        })
    })
    .then(response => response.json())
    .then(data => {
		//console.log(data);
        if (data.status == 0) {
            // 重新載入互評設定
            handleSearch(new Event('submit'));
            // 清空選擇 for select2
			$(`#${kpiSN}`).val(-1).trigger('change');
        }
		else {
			showMessage(data.message);
		}
    })
    .catch(error => showMessage(error));
}

function deletePeerEvaluation(kpiSN, raterId) {
	
    if (!confirm('確定要刪除此互評設定？')) return;
	
	
	fetch('/peer/deletePeerEvaluation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            kpi_sn: kpiSN,
            rater_id: raterId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status == 0) {
            // 重新載入互評設定
            handleSearch(new Event('submit'));
            // 清空選擇 for select2
			$(`#${kpiSN}`).val(-1).trigger('change');
        }
		else {
			showMessage(data.message);
		}
    })
    .catch(error => showMessage(error));
}

function matchCustom(params, data) {
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

function getEvaluationType(type) {
    const types = {
        '1': '工作成果',
        '2': '工作態度',
        '3': '專業能力',
        '4': '團隊合作'
    };
    return types[type] || type;
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
	window.location.href = '/login.html';
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}