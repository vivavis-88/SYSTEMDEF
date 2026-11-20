// Login pages: show/hide password, digits-only PIN, and the first layer of validation.
// The server checks every rule again, so this only gives faster feedback.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.togglePw);
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-pressed', show);
    });
  });

  document.querySelectorAll('input.pin').forEach(function (input) {
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });
  });

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      var msg = '';
      var q = function (sel) { return form.querySelector(sel); };
      var slug = q('input[name=slug]'), email = q('input[type=email]'),
          pw = q('input[name=password]'), name = q('input[name=name]'), pin = q('input.pin');

      if (slug && !/^[a-z0-9-]{1,40}$/.test(slug.value.trim().toLowerCase())) msg = 'Use letters, numbers and dashes only.';
      if (!msg && email && !/^\S+@\S+\.\S+$/.test(email.value.trim())) msg = 'Enter a valid email address.';
      if (!msg && pw && !pw.value) msg = 'Enter your password.';
      if (!msg && name && !name.value.trim()) msg = 'Enter your name.';
      if (!msg && pin && !/^\d{6}$/.test(pin.value)) msg = 'Your PIN is exactly 6 digits.';

      if (msg) {
        ev.preventDefault();
        var err = q('.err'), card = form.closest('.authcard');
        if (err) err.textContent = msg;
        if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
        return;
      }
      var submit = q('button[type=submit]');
      if (submit) submit.disabled = true; // no double submit
    });
  });
});
