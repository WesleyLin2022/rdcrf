document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = {
        id: document.getElementById('id').value
    };

    fetch('/member/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status == 0) {
            alert('密碼已發送至您的信箱');
            window.location.href = '/login.html';
        } else {
            alert(data.message || '密碼傳送失敗');
        }
    })
    .catch(error => {
        alert('後端伺服器時發生錯誤');
    });
});