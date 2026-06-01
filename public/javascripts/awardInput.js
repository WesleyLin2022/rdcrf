function loadAwardInputPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="container">
            <h2>Award輸入</h2>
            <div class="card mb-4">
                <div class="card-body">
                    <form id="awardInputForm">
                        <div class="mb-3">
                            <label for="projectSelect" class="form-label">專案名稱</label>
                            <select class="form-select" id="projectSelect" required>
                                <option value="">請選擇專案</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="excelFile" class="form-label">上傳Excel檔案</label>
                            <input type="file" class="form-control" id="excelFile" accept=".xlsx,.xls" required>
                        </div>
                        <button type="submit" class="btn btn-primary">上傳</button>
                    </form>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="scroll-container">
                        <table class="table table-bordered" id="awardDataTable">
                            <thead>
                                <tr>
                                    <th>等待資料載入...</th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 載入專案列表
    loadProjects();

    // 處理表單提交
    document.getElementById('awardInputForm').addEventListener('submit', handleAwardSubmit);
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
        console.error('載入專案失敗:', error);
        alert('載入專案列表失敗');
    }
}

async function handleAwardSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('projectId', document.getElementById('projectSelect').value);
    formData.append('file', document.getElementById('excelFile').files[0]);

    try {
        const response = await fetch('/api/award/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            displayAwardData(data);
            alert('Award資料上傳成功！');
        } else {
            alert('上傳失敗');
        }
    } catch (error) {
        console.error('錯誤:', error);
        alert('發生錯誤');
    }
}

function displayAwardData(data) {
    const table = document.getElementById('awardDataTable');
    table.innerHTML = '';
    
    if (data.length === 0) {
        table.innerHTML = '<tr><td>無資料</td></tr>';
        return;
    }

    // 創建表頭
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 創建表格內容
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
}
