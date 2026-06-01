document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('新密碼與確認密碼不符');
        return;
    }

    const formData = {
        id: document.getElementById('id').value,
        oldPassword: document.getElementById('oldPassword').value,
        newPassword: newPassword
    };

    fetch('/member/changePassword', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status == 0) {
            alert('密碼修改成功');
            window.location.href = '/login.html';
        } else {
            alert(data.message || '密碼修改失敗');
        }
    })
    .catch(error => {
        alert('修改密碼時發生錯誤');
    });
});