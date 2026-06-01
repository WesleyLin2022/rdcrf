function loadProjectModifyPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="container">
            <h2>專案修改</h2>
            <div class="card">
                <div class="card-body">
                    <form id="projectModifyForm">
                        <div class="mb-3">
                            <label for="projectSelect" class="form-label">專案名稱</label>
                            <select class="form-select" id="projectSelect" required>
                                <option value="">請選擇專案</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="managerEmail" class="form-label">負責人Email</label>
                            <input type="email" class="form-control" id="managerEmail" required>
                        </div>
                        <div class="mb-3">
                            <label for="reminderDate" class="form-label">提醒日期</label>
                            <input type="datetime-local" class="form-control" id="reminderDate" required>
                        </div>
                        <button type="submit" class="btn btn-primary">確定修改</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 載入專案列表
    loadProjects();

    // 監聽專案選擇變更
    document.getElementById('projectSelect').addEventListener('change', handleProjectSelect);

    // 處理表單提交
    document.getElementById('projectModifyForm').addEventListener('submit', handleProjectModify);
}

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        const select = document.getElementById('projectSelect');
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    } catch (error) {
        //console.error('載入專案失敗:', error);
        alert('載入專案列表失敗');
    }
}

async function handleProjectSelect(e) {
    const projectId = e.target.value;
    if (!projectId) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
            const project = await response.json();
            
            // 填充表單資料
            document.getElementById('managerEmail').value = project.email;
            document.getElementById('reminderDate').value = formatDateTime(project.reminderDate);
        } else {
            alert('載入專案詳細資料失敗');
        }
    } catch (error) {
        console.error('錯誤:', error);
        alert('發生錯誤');
    }
}

async function handleProjectModify(e) {
    e.preventDefault();
    const projectId = document.getElementById('projectSelect').value;
    
    const projectData = {
        email: document.getElementById('managerEmail').value,
        reminderDate: document.getElementById('reminderDate').value
    };

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });

        if (response.ok) {
            alert('專案修改成功！');
        } else {
            alert('專案修改失敗');
        }
    } catch (error) {
        console.error('錯誤:', error);
        alert('發生錯誤');
    }
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
}
