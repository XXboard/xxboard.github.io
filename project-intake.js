document.getElementById('project-form').addEventListener('submit', function (event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = `XXboard 项目咨询：${data.get('type')}`;
  const body = [
    `称呼：${data.get('name')}`,
    `联系邮箱：${data.get('email')}`,
    `项目类型：${data.get('type')}`,
    `预计数量：${data.get('quantity') || '待确认'}`,
    `目标时间：${data.get('timeline') || '待确认'}`,
    '',
    '项目需求：',
    data.get('details')
  ].join('\n');
  window.location.href = `mailto:contact@xxboard.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
