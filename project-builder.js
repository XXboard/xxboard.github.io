(function () {
  const storageKey = 'xxboard-project-v1';
  const isEnglishPage = document.documentElement.lang.toLowerCase().startsWith('en');
  const labels = isEnglishPage
    ? {overview:'Product Requirements', schematic:'Detailed Hardware · Schematic', pcb:'Detailed Hardware · PCB', software:'Detailed Software'}
    : {overview:'产品需求说明', schematic:'详细硬件描述 · 原理图', pcb:'详细硬件描述 · PCB', software:'详细软件描述'};
  const editLinks = isEnglishPage
    ? {overview:'project.html', schematic:'../schematic-design.html', pcb:'../pcb-design.html', software:'../software.html'}
    : {overview:'boss-intake.html', schematic:'schematic-design.html', pcb:'pcb-design.html', software:'software.html'};

  function projectType(project) {
    const hasHardware = Boolean(project.schematic || project.pcb);
    const hasSoftware = Boolean(project.software);
    if (hasHardware && hasSoftware) return 'A';
    if (hasHardware) return 'H';
    if (hasSoftware) return 'S';
    return 'B';
  }

  function projectNumber(project) {
    if (/^\d{6}$/.test(project.numberCode || '')) return project.numberCode;
    const existingNumber = project.id && project.id.match(/^XXB\d{8}[BHSA](\d{6})$/);
    if (existingNumber) {
      project.numberCode = existingNumber[1];
      return project.numberCode;
    }
    return '------';
  }

  function createProjectId(project) {
    const now = new Date();
    const existingDate = project.id && project.id.match(/^XXB-?(\d{8})/);
    const date = existingDate
      ? existingDate[1]
      : [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    return `XXB${date}${projectType(project)}${projectNumber(project)}`;
  }

  function readProject() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
    catch (error) { return {}; }
  }

  function writeProject(project) {
    project.id = createProjectId(project);
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
    if (indicator) indicator.textContent = isEnglishPage ? 'Saved in this browser' : '已保存到本机';
  }

  const stepForm = document.querySelector('[data-step-form]');
  if (stepForm) {
    const project = readProject();
    restoreForm(stepForm, project[stepForm.dataset.step]);
    if (project[stepForm.dataset.step]) {
      const indicator = document.querySelector('[data-saved-indicator]');
      if (indicator) indicator.textContent = isEnglishPage ? 'Previous answers restored' : '已读取上次保存内容';
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
      error.textContent = isEnglishPage ? `Please complete “${fieldName}” before continuing.` : `请先填写“${fieldName}”，然后再继续。`;
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
    const blocks = isEnglishPage
      ? ['XXboard Project Evaluation', `Project ID: ${project.id || 'Pending'}`]
      : ['XXboard 项目评估表', `项目编号：${project.id || '待生成'}`];
    const seenAnswers = {signatures:new Set(), longValues:new Set()};
    ['overview','schematic','pcb','software'].forEach(function (step) {
      if (!project[step]) return;
      const answers = uniqueAnswers(project[step], seenAnswers);
      if (!answers.length) return;
      blocks.push(`\n【${labels[step]}】`);
      answers.forEach(function ([key, value]) { blocks.push(`${key}：${value}`); });
    });
    if (project.contact) {
      blocks.push(isEnglishPage ? '\n【Contact】' : '\n【联系方式】');
      Object.entries(project.contact).forEach(function ([key, value]) {
        if (value) blocks.push(`${key}：${value}`);
      });
    }
    return blocks.join('\n');
  }

  function normalizedAnswer(value) {
    return String(value).toLowerCase().replace(/[\s，。；、,.!！?？:：;\-_]/g, '');
  }

  function uniqueAnswers(section, seenAnswers) {
    return Object.entries(section).filter(function ([key, value]) {
      const normalized = normalizedAnswer(value);
      const signature = `${normalizedAnswer(key)}:${normalized}`;
      const repeated = seenAnswers.signatures.has(signature) || (normalized.length >= 12 && seenAnswers.longValues.has(normalized));
      if (!normalized || repeated) return false;
      seenAnswers.signatures.add(signature);
      if (normalized.length >= 12) seenAnswers.longValues.add(normalized);
      return true;
    });
  }

  const summaryRoot = document.querySelector('[data-project-summary]');
  if (summaryRoot) {
    const project = readProject();
    if (!project.id) {
      project.id = createProjectId(project);
      writeProject(project);
    } else {
      const currentId = createProjectId(project);
      if (project.id !== currentId) {
        project.id = currentId;
        writeProject(project);
      }
    }
    const projectIdNode = document.querySelector('[data-project-id]');
    if (projectIdNode) projectIdNode.textContent = project.id;
    const steps = ['overview','schematic','pcb','software'].filter(function (step) { return project[step]; });
    const empty = document.querySelector('[data-empty-state]');
    const status = document.querySelector('[data-summary-status]');
    if (!steps.length) {
      empty.hidden = false;
      summaryRoot.hidden = true;
      status.textContent = isEnglishPage ? 'No project information has been saved' : '尚未保存任何项目内容';
    } else {
      status.textContent = isEnglishPage ? `${steps.length} requirement section(s) saved` : `已保存 ${steps.length} 项需求内容`;
      const seenAnswers = {signatures:new Set(), longValues:new Set()};
      let lastGroup = '';
      steps.forEach(function (step) {
        const answers = uniqueAnswers(project[step], seenAnswers);
        if (!answers.length) return;
        const group = step === 'overview' ? 'overview' : (step === 'software' ? 'software' : 'hardware');
        if (group !== 'overview' && group !== lastGroup) {
          const groupHeading = document.createElement('h2');
          groupHeading.className = 'summary-detail-heading';
          groupHeading.textContent = group === 'hardware'
            ? (isEnglishPage ? 'Detailed hardware description' : '详细硬件描述')
            : (isEnglishPage ? 'Detailed software description' : '详细软件描述');
          summaryRoot.appendChild(groupHeading);
        }
        lastGroup = group;
        const section = document.createElement('section');
        section.className = 'summary-card';
        const heading = document.createElement('div');
        heading.className = `summary-card-head${step === 'overview' ? ' overview-head' : ''}`;
        const actions = `<span class="summary-card-actions"><a href="${editLinks[step]}">${isEnglishPage ? 'Edit' : '修改'}</a><button type="button" data-delete-step="${step}">${isEnglishPage ? 'Delete' : '删除'}</button></span>`;
        heading.innerHTML = step === 'overview'
          ? `<h2>${labels[step]}</h2><span class="summary-project-id">${isEnglishPage ? 'Project ID' : '项目编号'}：${project.id}</span>${actions}`
          : `<h2>${labels[step]}</h2>${actions}`;
        section.appendChild(heading);
        const list = document.createElement('dl');
        answers.forEach(function ([key, value]) {
          const dt = document.createElement('dt'); dt.textContent = key;
          const dd = document.createElement('dd'); dd.textContent = value;
          list.append(dt, dd);
        });
        section.appendChild(list);
        summaryRoot.appendChild(section);
        heading.querySelector('[data-delete-step]').addEventListener('click', function () {
          if (!confirm(isEnglishPage ? `Delete “${labels[step]}”? Other project information will not be affected.` : `确定删除“${labels[step]}”吗？其他项目内容不会受到影响。`)) return;
          delete project[step];
          project.updatedAt = new Date().toISOString();
          writeProject(project);
          location.reload();
        });
      });
    }
    document.querySelector('[data-copy-summary]').addEventListener('click', async function () {
      await navigator.clipboard.writeText(projectText(project));
      this.textContent = isEnglishPage ? 'Copied' : '已复制';
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
        contactError.textContent = isEnglishPage ? 'Please provide at least a phone number, WhatsApp/WeChat, or email address.' : '请至少填写电话号码、微信号码或电子邮箱中的一种。';
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
      button.textContent = isEnglishPage ? 'Submitting…' : '正在提交……';
      const dateMatch = project.id.match(/^XXB(\d{8})/);
      const serviceUrl = 'https://script.google.com/macros/s/AKfycbwCBhObq8oMI4zdKdj3AXc-6-ny07dzbDif5J2Kf3N-guewyNE0RYP3gnSGHNBFd2g2pA/exec';
      try {
        const response = await fetch(serviceUrl, {
          method: 'POST',
          body: JSON.stringify({
            language: isEnglishPage ? 'en' : 'zh',
            type: projectType(project),
            date: dateMatch ? dateMatch[1] : '',
            projectText: projectText(project)
          })
        });
        const result = await response.json().catch(function () { return {}; });
        const accepted = result.success === true || result.success === 'true';
        if (!response.ok || !accepted || !/^XXB\d{8}[BHSA]\d{6}$/.test(result.projectId || '')) {
          throw new Error(result.message || (isEnglishPage ? 'The project service did not confirm receipt' : '项目服务未确认接收'));
        }
        project.id = result.projectId;
        project.numberCode = result.projectId.slice(-6);
        project.submittedAt = new Date().toISOString();
        writeProject(project);
        document.querySelectorAll('[data-project-id]').forEach(function (node) { node.textContent = project.id; });
        document.querySelectorAll('.summary-project-id').forEach(function (node) {
          node.textContent = `${isEnglishPage ? 'Project ID' : '项目编号'}：${project.id}`;
        });
        contactError.textContent = '';
        button.textContent = isEnglishPage ? 'Project evaluation completed' : '项目评估表已完成';
        button.classList.add('completed');
      } catch (error) {
        contactError.textContent = isEnglishPage ? `Submission could not be completed: ${error.message}. Your answers remain saved in this browser.` : `暂时未能完成提交：${error.message}。填写内容已保存在本机。`;
        button.disabled = false;
        button.textContent = isEnglishPage ? 'Complete project evaluation' : '完成项目评估表';
      }
    });
    document.querySelector('[data-clear-project]').addEventListener('click', function () {
      if (confirm('确定清空本机保存的项目内容吗？')) { localStorage.removeItem(storageKey); location.reload(); }
    });
  }
})();
