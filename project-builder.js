(function () {
  const storageKey = 'xxboard-project-v1';
  const labels = {overview:'产品需求说明', schematic:'原理图设计', pcb:'PCB 设计', software:'软件开发'};
  const editLinks = {overview:'boss-intake.html', schematic:'schematic-design.html', pcb:'pcb-design.html', software:'software.html'};

  function createProjectId() {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    const random = Array.from(crypto.getRandomValues(new Uint8Array(3)), function (value) {
      return (value % 36).toString(36).toUpperCase();
    }).join('');
    return `XXB-${date}-${random}`;
  }

  function readProject() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
    catch (error) { return {}; }
  }

  function writeProject(project) {
    if (!project.id) project.id = createProjectId();
    localStorage.setItem(storageKey, JSON.stringify(project));
  }

  function formValues(form) {
    const values = {};
    new FormData(form).forEach(function (value, key) {
      const field = form.elements.namedItem(key);
      if (field && field.dataset && field.dataset.requires) {
        const requiredField = form.elements.namedItem(field.dataset.requires);
        if (!requiredField || !String(requiredField.value).trim()) return;
      }
      if (!String(value).trim()) return;
      if (values[key]) values[key] = `${values[key]}、${value}`;
      else values[key] = value;
    });
    return values;
  }

  function restoreForm(form, values) {
    if (!values) return;
    Object.entries(values).forEach(function ([name, value]) {
      const fields = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      fields.forEach(function (field) {
        if (field.type === 'radio') field.checked = field.value === value;
        else if (field.type === 'checkbox') field.checked = String(value).split('、').includes(field.value);
        else field.value = value;
      });
    });
  }

  function saveForm(form) {
    const project = readProject();
    project[form.dataset.step] = formValues(form);
    project.updatedAt = new Date().toISOString();
    writeProject(project);
    const indicator = document.querySelector('[data-saved-indicator]');
    if (indicator) indicator.textContent = '已保存到本机';
  }

  const stepForm = document.querySelector('[data-step-form]');
  if (stepForm) {
    const project = readProject();
    restoreForm(stepForm, project[stepForm.dataset.step]);
    if (project[stepForm.dataset.step]) {
      const indicator = document.querySelector('[data-saved-indicator]');
      if (indicator) indicator.textContent = '已读取上次保存内容';
    }
    stepForm.addEventListener('invalid', function (event) {
      event.preventDefault();
      let error = stepForm.querySelector('.form-validation-error');
      if (!error) {
        error = document.createElement('p');
        error.className = 'form-validation-error';
        const actions = stepForm.querySelector('.builder-actions');
        if (actions) actions.before(error);
        else stepForm.appendChild(error);
      }
      const label = event.target.closest('label');
      const fieldName = label ? label.childNodes[0].textContent.trim() : '必填内容';
      error.textContent = `请先填写“${fieldName}”，然后再继续。`;
      event.target.focus();
      event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, true);
    stepForm.addEventListener('input', function () {
      const error = stepForm.querySelector('.form-validation-error');
      if (error) error.textContent = '';
    });
    stepForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!stepForm.reportValidity()) return;
      saveForm(stepForm);
      location.href = stepForm.dataset.next;
    });
    document.querySelectorAll('[data-save-and-go]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        saveForm(stepForm);
        location.href = link.getAttribute('href');
      });
    });
  }

  function projectText(project) {
    const blocks = ['XXboard 项目评估表', `项目编号：${project.id || '待生成'}`];
    ['overview','schematic','pcb','software'].forEach(function (step) {
      if (!project[step]) return;
      blocks.push(`\n【${labels[step]}】`);
      Object.entries(project[step]).forEach(function ([key, value]) { blocks.push(`${key}：${value}`); });
    });
    if (project.contact) {
      blocks.push('\n【联系方式】');
      Object.entries(project.contact).forEach(function ([key, value]) {
        if (value) blocks.push(`${key}：${value}`);
      });
    }
    return blocks.join('\n');
  }

  const summaryRoot = document.querySelector('[data-project-summary]');
  if (summaryRoot) {
    const project = readProject();
    if (!project.id) {
      project.id = createProjectId();
      writeProject(project);
    }
    const projectIdNode = document.querySelector('[data-project-id]');
    if (projectIdNode) projectIdNode.textContent = project.id;
    const steps = ['overview','schematic','pcb','software'].filter(function (step) { return project[step]; });
    const empty = document.querySelector('[data-empty-state]');
    const status = document.querySelector('[data-summary-status]');
    if (!steps.length) {
      empty.hidden = false;
      summaryRoot.hidden = true;
      status.textContent = '尚未保存任何项目内容';
    } else {
      status.textContent = `已保存 ${steps.length} 项需求内容`;
      steps.forEach(function (step) {
        const section = document.createElement('section');
        section.className = 'summary-card';
        const heading = document.createElement('div');
        heading.className = `summary-card-head${step === 'overview' ? ' overview-head' : ''}`;
        const actions = `<span class="summary-card-actions"><a href="${editLinks[step]}">修改</a><button type="button" data-delete-step="${step}">删除</button></span>`;
        heading.innerHTML = step === 'overview'
          ? `<h2>${labels[step]}</h2><span class="summary-project-id">项目编号：${project.id}</span>${actions}`
          : `<h2>${labels[step]}</h2>${actions}`;
        section.appendChild(heading);
        const list = document.createElement('dl');
        Object.entries(project[step]).forEach(function ([key, value]) {
          const dt = document.createElement('dt'); dt.textContent = key;
          const dd = document.createElement('dd'); dd.textContent = value;
          list.append(dt, dd);
        });
        section.appendChild(list);
        summaryRoot.appendChild(section);
        heading.querySelector('[data-delete-step]').addEventListener('click', function () {
          if (!confirm(`确定删除“${labels[step]}”吗？其他项目内容不会受到影响。`)) return;
          delete project[step];
          project.updatedAt = new Date().toISOString();
          writeProject(project);
          location.reload();
        });
      });
    }
    document.querySelector('[data-copy-summary]').addEventListener('click', async function () {
      await navigator.clipboard.writeText(projectText(project));
      this.textContent = '已复制';
    });
    document.querySelector('[data-print-summary]').addEventListener('click', function () { window.print(); });
    const contactForm = document.querySelector('[data-contact-form]');
    const contactError = document.querySelector('[data-contact-error]');
    const contactFields = Array.from(contactForm.querySelectorAll('input'));
    if (project.contact) {
      contactFields.forEach(function (field) { field.value = project.contact[field.name] || ''; });
    }
    function saveContact() {
      const contact = {};
      contactFields.forEach(function (field) { contact[field.name] = field.value.trim(); });
      if (!Object.values(contact).some(Boolean)) {
        contactError.textContent = '请至少填写电话号码、微信号码或电子邮箱中的一种。';
        contactFields[0].focus();
        return false;
      }
      contactError.textContent = '';
      project.contact = contact;
      project.updatedAt = new Date().toISOString();
      writeProject(project);
      return true;
    }
    contactForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!saveContact()) return;
      const button = contactForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = '正在提交……';
      const isChinesePage = document.documentElement.lang.toLowerCase().startsWith('zh');
      const recipient = isChinesePage ? 'TUZHIQUAN@126.COM' : 'IWTFNSC@GMAIL.COM';
      const submission = new FormData();
      submission.append('_subject', `${isChinesePage ? 'XXboard 新项目需求' : 'XXboard New Project Request'} ${project.id}`);
      submission.append('_template', 'table');
      submission.append('_captcha', 'false');
      submission.append('项目编号', project.id);
      Object.entries(project.contact).forEach(function ([key, value]) {
        if (value) submission.append(key, value);
      });
      submission.append('项目需求', projectText(project));
      try {
        const response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: submission
        });
        const result = await response.json().catch(function () { return {}; });
        const accepted = result.success === true || result.success === 'true';
        if (!response.ok || !accepted) throw new Error(result.message || '第三方服务未确认接收');
        contactError.textContent = '';
        button.textContent = '项目评估表已完成';
        button.classList.add('completed');
      } catch (error) {
        contactError.textContent = `暂时未能完成提交：${error.message}。填写内容已保存在本机。`;
        button.disabled = false;
        button.textContent = '完成项目评估表';
      }
    });
    document.querySelector('[data-clear-project]').addEventListener('click', function () {
      if (confirm('确定清空本机保存的项目内容吗？')) { localStorage.removeItem(storageKey); location.reload(); }
    });
  }
})();
