document.addEventListener('DOMContentLoaded', function() {
    // 檢查登入狀態
    checkLoginStatus();

    // 處理登出按鈕
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // 處理表單提交
    document.getElementById('projectCreateForm').addEventListener('submit', handleProjectCreate);
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

function handleProjectCreate(e) {
    e.preventDefault();

    const projectData = {
		pid: document.getElementById('projectName').value,
        ownerid: document.getElementById('userId').textContent,
        reminderDate: document.getElementById('projectDate').value
    };
	try {
        fetch('/project/createProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        })
	    .then(res => res.json())
		.then(data => {
		    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
            const modalMessage = document.getElementById('modalMessage');
			if (data.status == 0){
			    //alert('專案建立成功！');
				modalMessage.textContent = '專案建立成功！';
				document.getElementById('projectCreateForm').reset();
		    }
			else {
				//alert('專案建立失敗');
				modalMessage.textContent = data.message || '專案建立失敗';
			}
			messageModal.show();
		});
	
    } catch (error) {
        //console.error('錯誤:', error);
        //alert('發生錯誤');
		const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
        document.getElementById('modalMessage').textContent = '系統錯誤，請稍後再試';
        messageModal.show();
    }
    
}