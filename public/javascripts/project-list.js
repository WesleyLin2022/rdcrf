document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Select2
    $('#projectId').select2({
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

    // 檢查登入狀態
    checkLoginStatus();

    // 處理登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 處理表單提交
    document.getElementById('projectSearchForm').addEventListener('submit', handleProjectSearch);
});

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

function handleProjectSearch(e) {
    e.preventDefault();
    const projectId = document.getElementById('projectId').value;

    if (!projectId) {
        showMessage('請選擇專案名稱');
        return;
    }
	
	try {
	    fetch('/project/searchProject', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({id:projectId})
		})
		.then(res => res.json())
		.then(data => {
			if (data.length >= 1){
				displayProjectInfo(data);
			}
			else {
				displayProjectInfo([]);
				showMessage('尚未上傳資料');
			}
		});
	} catch (error) {
		showMessage('系統錯誤，請稍後再試');
		
	}
}

function formatDateForInput(dateStr) {
	if (!dateStr) return '';
	// 轉換成 Date 再輸出 yyyy-MM-dd
	const d = new Date(dateStr);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}


function displayProjectInfo(projects) {
    const projectDetails = document.getElementById('projectDetails');
    
	const tbody = document.getElementById('projectInfo');
	tbody.innerHTML = ''; // 這行會清空舊資料
    projects.forEach(project => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${project.id}</td>
			<td>${project.owner_id}-${project.owner_name}</td>
            <td>
               <span class="kickoff-text">${formatDateForInput(project.kickoff) || ''}</span>
               <input type="date" class="kickoff-input d-none" value="${formatDateForInput(project.kickoff) || ''}">
            </td>
            <td>${project.note || ''}</td>
            <td></td>
        `;

        const actionTd = tr.querySelector('td:last-child');

        // 只有負責人可編輯
        if (project.owner_id === document.getElementById('userId').textContent) {
            const btn = document.createElement('button');
            btn.textContent = '編輯';
            btn.classList.add('btn', 'btn-sm', 'btn-primary');

            btn.addEventListener('click', async () => {
                const textEl = tr.querySelector('.kickoff-text');
                const inputEl = tr.querySelector('.kickoff-input');

                if (btn.textContent === '編輯') {
                    // 進入編輯模式
                    textEl.classList.add('d-none');
                    inputEl.classList.remove('d-none');
                    btn.textContent = '確定';
                } else {
                    // 更新資料
                    const newDate = inputEl.value;
					
					try {
						fetch('/project/updateProjectKickOff', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({kickoff: newDate, projectId: project.id})
						})
						.then(res => res.json())
						.then(data => {
							if (data.status == 0){
								showProjects();
							}
							else {
								showMessage('更新失敗，請稍後再試');
							}
						});
					} catch (error) {
						showMessage('系統錯誤，請稍後再試');
						
					}
					
                    
					
                }
            });
            actionTd.appendChild(btn);
        }
        tbody.appendChild(tr);
    });
	
    projectDetails.classList.remove('d-none');
	
}

function showProjects() {
	const projectId = document.getElementById('projectId').value;

    if (!projectId) {
        return;
    }
	
	try {
	    fetch('/project/searchProject', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({id:projectId})
		})
		.then(res => res.json())
		.then(data => {
			if (data.length >= 1){
				displayProjectInfo(data);
			}
			else {
				showMessage('尚未上傳資料');
			}
		});
	} catch (error) {
		showMessage('系統錯誤，請稍後再試');
		
	}
}

function showMessage(message) {
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    document.getElementById('modalMessage').textContent = message;
    messageModal.show();
}