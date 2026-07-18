/* ===========================================================
   个人中心 (Profile) 脚本
   - 头像：选择即预览并立即上传（PNG/JPG/JPEG ≤2MB）
   - 资料：AJAX 提交昵称/邮箱
   - 密码：当前密码校验 + 二次确认，AJAX 提交
   - 成功/失败通过全局 showNotification(category, msg) 提示
   =========================================================== */
(function () {
    'use strict';

    var token = '';
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) token = meta.getAttribute('content');

    function notify(msg, category) {
        if (window.showNotification) window.showNotification(msg, category || 'info');
    }

    function postJSON(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        }).then(function (r) { return r.json(); });
    }

    /* ---------- 头像：预览 + 立即上传 ---------- */
    var avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function () {
            var file = this.files[0];
            if (!file) return;

            // 本地预览
            var reader = new FileReader();
            reader.onload = function (e) {
                var wrap = document.querySelector('.profile-avatar.lg');
                var preview = document.getElementById('avatar-preview');
                if (!preview) {
                    wrap.innerHTML = '<img src="" id="avatar-preview" alt="头像">';
                    preview = document.getElementById('avatar-preview');
                }
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // 上传
            var fd = new FormData();
            fd.append('avatar', file);
            var headers = {};
            if (token) headers['X-CSRFToken'] = token;
            fetch('/profile/api/avatar', {
                method: 'POST',
                headers: headers,
                credentials: 'same-origin',
                body: fd
            })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (!res.ok) { notify(res.msg || '头像上传失败', 'danger'); return; }
                var pv = document.getElementById('avatar-preview');
                if (pv && res.url) pv.src = res.url;
                notify(res.msg || '头像已更新', 'success');
            })
            .catch(function () { notify('头像上传失败，请重试', 'danger'); });
        });
    }

    /* ---------- 保存修改 ---------- */
    var saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            var nickname = document.getElementById('nickname').value.trim();
            var email = document.getElementById('email').value.trim();
            var pwCurrent = document.getElementById('pw-current').value;
            var pwNew = document.getElementById('pw-new').value;
            var pwConfirm = document.getElementById('pw-confirm').value;
            var mismatch = document.getElementById('pw-mismatch');

            // 密码二次确认
            if (pwNew || pwCurrent) {
                if (pwNew !== pwConfirm) {
                    if (mismatch) mismatch.classList.remove('d-none');
                    notify('两次输入的新密码不一致', 'danger');
                    return;
                }
                if (mismatch) mismatch.classList.add('d-none');
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 保存中...';

            var chain = Promise.resolve();
            // 1) 若填写了密码，先改密码
            if (pwNew) {
                chain = chain.then(function () {
                    return postJSON('/profile/api/change-password', {
                        current: pwCurrent, new: pwNew, confirm: pwConfirm
                    }).then(function (res) {
                        if (!res.ok) throw new Error(res.msg || '密码修改失败');
                    });
                });
            }
            // 2) 再保存昵称/邮箱
            chain = chain.then(function () {
                return postJSON('/profile/api/update', { nickname: nickname, email: email })
                    .then(function (res) {
                        if (!res.ok) throw new Error(res.msg || '保存失败');
                        notify('保存成功', 'success');
                        setTimeout(function () { window.location.href = '/profile'; }, 700);
                    });
            });

            chain.catch(function (err) {
                notify(err.message || '保存失败，请重试', 'danger');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> 保存修改';
            });
        });
    }
})();
