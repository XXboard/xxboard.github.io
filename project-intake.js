document.querySelectorAll('[data-project-form]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(form);
    const lines = [];
    for (const [key, value] of data.entries()) {
      if (String(value).trim()) lines.push(`${key}：${value}`);
    }
    const subject = form.dataset.subject || 'XXboard 项目咨询';
    const body = ['XXboard 项目需求', '----------------', ...lines].join('\n\n');
    window.location.href = `mailto:contact@xxboard.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});
