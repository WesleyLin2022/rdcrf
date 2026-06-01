function employeeEvaluation() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="container">
            <h2>KPI 輸入</h2>
            <form id="projectCreateForm" class="mt-4">
                <div class="mb-3">
                    <label for="KPIItem" class="form-label">KPI項目要點</label>
                    <input type="text" class="form-control" id="KPIItem" required>
                </div>
                <div class="mb-3">
                    <label for="contribution" class="form-label">具體貢獻</label>
                    <input type="text" class="form-control" id="contribution" required>
                </div>
                <div class="mb-3">
                    <label for="selfScore" class="form-label">自我評分</label>
                    <input type="text" class="form-control" id="selfScore" required>
                </div>
                <button type="submit" class="btn btn-primary">新增</button>
            </form>
			
			<div class="card">
                <div class="card-body">
                    <div class="scroll-container">
                        <table class="table table-bordered" id="kpiTable">
                            <thead>
                                <tr>
                                    <th>員工工號</th>
                                    <th>KPI 項目</th>
					                <th>具體貢獻</th>
                                    <th>自評分數</th>
                                    <th>主管評分</th>
                                    <th>總分</th>
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

    document.getElementById('projectCreateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const kpiData = {
            item: document.getElementById('KPIItem').value,
            contribution: document.getElementById('contribution').value,
            Score: document.getElementById('selfScore').value
        };

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(kpiData)
            });

            if (response.ok) {
                alert('專案建立成功！');
                document.getElementById('projectCreateForm').reset();
            } else {
                alert('專案建立失敗');
            }
        } catch (error) {
            console.error('錯誤:', error);
            alert('發生錯誤');
        }
    });
}
