function employerEvaluation() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="container">
            <h2>專案建立</h2>
            <form id="projectCreateForm" class="mt-4">
                <div class="mb-3">
                    <label for="projectName" class="form-label">專案名稱</label>
                    <input type="text" class="form-control" id="projectName" required>
                </div>
                <div class="mb-3">
                    <label for="managerID" class="form-label">負責人ID</label>
                    <input type="email" class="form-control" id="managerID" required>
                </div>
                <div class="mb-3">
                    <label for="reminderDate" class="form-label">Kick Off 日期</label>
                    <input type="date" class="form-control" id="reminderDate" required>
                </div>
                <button type="submit" class="btn btn-primary">建立專案</button>
            </form>
        </div>
    `;

    document.getElementById('projectCreateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectData = {
            name: document.getElementById('projectName').value,
            id: document.getElementById('managerID').value,
            reminderDate: document.getElementById('reminderDate').value
        };

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
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
