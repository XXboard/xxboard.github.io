(function () {
  const storageKey = 'xxboard-project-v1';
  const labels = {schematic:'原理图设计', pcb:'PCB 设计', software:'软件开发'};
  const editLinks = {schematic:'schematic-design.html', pcb:'pcb-design.html', software:'software.html'};

  function readProject() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
    catch (error) { return {}; }
  }

  function writeProject(project) {
    localStorage.setItem(storageKey, JSON.stringify(project));
  }

  function formValues(form) {
    const values = {};
    new FormData(form).forEach(function (value, key) {
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
    stepForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!stepForm.reportValidity()) return;
      saveForm(stepForm);
      location.href = stepForm.dataset.next;
    });
    document.querySelectorAll('[data-save-and-go]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        if (!stepForm.reportValidity()) return;
        saveForm(stepForm);
        location.href = link.getAttribute('href');
      });
    });
  }

  function projectText(project) {
    const blocks = ['XXboard 项目需求'];
    ['schematic','pcb','software'].forEach(function (step) {
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
    const steps = ['schematic','pcb','software'].filter(function (step) { return project[step]; });
    const empty = document.querySelector('[data-empty-state]');
    const status = document.querySelector('[data-summary-status]');
    if (!steps.length) {
      empty.hidden = false;
      summaryRoot.hidden = true;
      status.textContent = '尚未保存任何项目内容';
    } else {
      status.textContent = `已完成 ${steps.length} / 3 个项目步骤`;
      steps.forEach(function (step) {
        const section = document.createElement('section');
        section.className = 'summary-card';
        const heading = document.createElement('div');
        heading.className = 'summary-card-head';
        heading.innerHTML = `<h2>${labels[step]}</h2><a href="${editLinks[step]}">修改</a>`;
        section.appendChild(heading);
        const list = document.createElement('dl');
        Object.entries(project[step]).forEach(function ([key, value]) {
          const dt = document.createElement('dt'); dt.textContent = key;
          const dd = document.createElement('dd'); dd.textContent = value;
          list.append(dt, dd);
        });
        section.appendChild(list);
        summaryRoot.appendChild(section);
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
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!saveContact()) return;
      const button = contactForm.querySelector('button[type="submit"]');
      button.textContent = '项目已完成并保存';
      button.classList.add('completed');
    });
    document.querySelector('[data-email-summary]').addEventListener('click', function () {
      if (!saveContact()) return;
      location.href = `mailto:contact@xxboard.com?subject=${encodeURIComponent('XXboard 新项目需求')}&body=${encodeURIComponent(projectText(project))}`;
    });
    document.querySelector('[data-clear-project]').addEventListener('click', function () {
      if (confirm('确定清空本机保存的项目内容吗？')) { localStorage.removeItem(storageKey); location.reload(); }
    });
  }
})();
