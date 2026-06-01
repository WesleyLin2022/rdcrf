function loadRFQQueryPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="container">
            <h2>RFQ查詢</h2>
            <div class="card mb-4">
                <div class="card-body">
                    <form id="rfqQueryForm">
                        <div class="mb-3">
                            <label for="projectSelect" class="form-label">專案名稱</label>
                            <select class="form-select" id="projectSelect">
                                <option value="">全部</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary">查詢</button>
                    </form>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="scroll-container">
                        <table class="table table-bordered" id="rfqResultTable">
                            <thead>
                                <tr>
                                    <th>等待查詢...</th>
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

    // 處理查詢
    document.getElementById('rfqQueryForm').addEventListener('submit', handleRFQQuery);
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
    }
}

async function handleRFQQuery(e) {
    e.preventDefault();
    const projectId = document.getElementById('projectSelect').value;
    
    try {
        const response = await fetch(`/api/rfq/query${projectId ? `?projectId=${projectId}` : ''}`);
        if (response.ok) {
            const data = await response.json();
            displayRFQData(data);
        } else {
            alert('查詢失敗');
        }
    } catch (error) {
        console.error('錯誤:', error);
        alert('發生錯誤');
    }
}

function displayRFQData(data) {
    const table = document.getElementById('rfqResultTable');
    // 清空表格
    table.innerHTML = '';
    
    if (data.length === 0) {
        table.innerHTML = '<tr><td>無查詢結果</td></tr>';
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
