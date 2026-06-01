let peersList = []; // 儲存所有員工資料
checkLoginStatus();

document.addEventListener('DOMContentLoaded', function() {
    initializeSelect2();
    //loadPeerList();
    setupEventListeners();
});

function initializeSelect2() {
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
				loadPeerList(data.user.id);
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        });
    }
}

function loadPeerList(id) {
	const now_year = new Date().getFullYear();
    let now_month = new Date().getMonth() + 1;
    let month_opt = "";
    if (now_month >= 5 && now_month <=8 ) {
	    month_opt = '年中';
    }
    else {
	    month_opt = '年底';
    }
	
	const formData = {
		id:  id,
		year: now_year,
		month: month_opt
    };
	fetch('/peer/getPeerRecordCurrent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status == 0) {
            peersList = data.results.slice();
			updatePeerSelect();
			console.log(peersList);
			
        } else {
            showMessage(data.message || '評分更新失敗');
        }
    })
    .catch(error => {
        showMessage('系統錯誤，請稍後再試');
    });
	
}

function updatePeerSelect() {
    const peerIds = [...new Set(peersList.map(peer => peer.id))];
	const employeeSelect = $('#employeeId');
	console.log(peerIds);
	
	const User_Id_Name = [];
	let completed = 0;
	peerIds.forEach(peer => {
		const xhr1 = new XMLHttpRequest();
		xhr1.open('GET', `/peer/getUserById?id=${peer}`);
		xhr1.onreadystatechange = function () {
			if (xhr1.readyState === 4) {
				if (xhr1.status === 200) {
					try {
						const UserData = JSON.parse(xhr1.responseText);
						
						if ( UserData.status != 0 ) {
							console.error('Invalid UserData');
							return;
						}
						User_Id_Name.push({'id':UserData.results[0].id, 'name':UserData.results[0].name});
						completed++;
						
						if (completed === peerIds.length) {
							User_Id_Name.forEach(user => {
								employeeSelect.append(new Option(`${user.id} - ${user.name}`, `${user.id}`, false, false));
							});
						}
						
					}//end of try
					catch(err){
						console.error('Error getKPIbySN response:', err);
					}
				}//end of if (xhr1.status === 200)
				else {
					console.error('Get User request failed:', xhr1.status);
				}
			}//end of if xhr1.readyState === 4
		};
		xhr1.send();
		
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
	
	displayEvaluations(employeeId);
	document.getElementById('evaluationContent').classList.remove('d-none');
}

function displayEvaluations(Id) {
	console.log(Id);
    const container = document.getElementById('evaluationList');
    container.innerHTML = '';
	
	evaluationList = peersList.slice().filter(peer => peer.id == Id);
    console.log(evaluationList);
	evaluationList.forEach(evaluation => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${evaluation.type}</td>
            <td>${evaluation.item}</td>
            <td>${evaluation.contribution1}</td>
            <td>${evaluation.contribution2}</td>
            <td>${evaluation.contribution3}</td>
            <td>
                <input type="number" 
                       class="form-control score-input" 
                       value="${evaluation.score || ''}"
                       min="0" 
                       max="5" 
                       data-id="${evaluation.serial_number}">
            </td>
            <td>
                <button class="btn btn-primary btn-sm" 
                        onclick="submitScore(${evaluation.serial_number}, this)">
                    評分
                </button>
            </td>
        `;
        container.appendChild(tr);
    });
	
	
	
    /*evaluationList.forEach(evaluation => {
        const div = document.createElement('div');
        div.className = 'evaluation-item';
        div.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-2">
                    <strong>${(evaluation.type)}</strong>
                </div>
                <div class="col-md-3">
                    <span class="text-muted">項目要點：</span>
                    ${evaluation.item}
                </div>
                <div class="col-md-4">
                    <span class="text-muted">具體描述1：</span>
                    ${evaluation.contribution1}
                </div>
				<div class="col-md-4">
                    <span class="text-muted">具體描述2：</span>
                    ${evaluation.contribution2}
                </div>
				<div class="col-md-4">
                    <span class="text-muted">具體描述3：</span>
                    ${evaluation.contribution3}
                </div>
                <div class="col-md-2">
                    <div class="input-group">
                        <input type="number" 
                               class="form-control score-input" 
                               value="${evaluation.colleague_scores || ''}"
                               min="0" 
                               max="5" 
                               placeholder="0-5分"
                               data-id="${evaluation.serial_number}">
                    </div>
                </div>
                <div class="col-md-1">
                    <button class="btn btn-primary btn-sm btn-score w-100" 
                            onclick="submitScore('${evaluation.serial_number}', this)">
                        評分
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });*/
}

function submitScore(SN, button) {
    const scoreInput = button.closest('tr').querySelector('.score-input');
    const score = scoreInput.value;
	const userId = document.getElementById('userId').textContent;
	

    if (!score || score < 0 || score > 5) {
        alert('請輸入0-5之間的分數');
        return;
    }
	
	const formData = {
		serial_number:  SN,
		colleague_score: score,
		rater_id: userId
    };
	fetch('/peer/UpdateColleagueScorebySN', {
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