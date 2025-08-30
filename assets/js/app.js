// Lista de Tarefas MVP
// Requisitos atendidos: adicionar, remover, limite(10), capitalizar, persistir (localStorage), validação não vazia, responsivo, feedback visual

(function() {
  'use strict';

  // Seletores
  const form = document.getElementById('form-tarefa');
  const input = document.getElementById('entrada-tarefa');
  const btnAdicionar = document.getElementById('btn-adicionar');
  const lista = document.getElementById('lista-tarefas');
  const template = document.getElementById('template-item');
  const contador = document.getElementById('contador');
  const mensagem = document.getElementById('mensagem');
  const btnLimpar = document.getElementById('btn-limpar');
  const btnUndo = document.getElementById('btn-undo');
  const popup = document.getElementById('popup-limite');
  const popupFechar = document.getElementById('popup-fechar');

  const LIMITE = 10;
  const STORAGE_KEY = 'mvp_tarefas_v1';

  let tarefas = [];
  const historico = []; // stack de estados anteriores para undo
  const pushHistorico = () => {
    historico.push(JSON.stringify(tarefas));
    if (historico.length > 50) historico.shift(); // limite de histórico
    btnUndo.disabled = historico.length === 0;
  };
  const restaurarUltimo = () => {
    if (!historico.length) return;
    const anterior = historico.pop();
    try { tarefas = JSON.parse(anterior) || []; } catch { /* noop */ }
    salvar();
    renderizar(false);
    setMensagem('Ação desfeita.', 'sucesso');
    btnUndo.disabled = historico.length === 0;
  };

  // Utilidades
  const salvar = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
  const carregar = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  };
  const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
  const atualizarContador = () => { contador.textContent = tarefas.length; };

  const setMensagem = (texto, tipo = '') => {
    mensagem.textContent = texto;
    mensagem.className = 'mensagem' + (tipo ? ' ' + tipo : '');
  };

  function bloquearSeLimite() {
    const atingiu = tarefas.length >= LIMITE;
    input.disabled = atingiu;
    btnAdicionar.disabled = atingiu;
    if (atingiu) {
      setMensagem('Limite máximo de ' + LIMITE + ' tarefas atingido.', 'erro');
      abrirPopupLimite();
    }
  }

  function abrirPopupLimite() {
    popup.classList.remove('hidden');
    popupFechar.focus();
  }
  function fecharPopupLimite() { popup.classList.add('hidden'); }

  function criarItem(tarefa) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = tarefa.id;
    const spanTexto = node.querySelector('.texto');
    spanTexto.textContent = tarefa.texto;
    node.querySelector('.remover').addEventListener('click', () => removerTarefa(tarefa.id));
    node.querySelector('.editar').addEventListener('click', () => iniciarEdicao(node, tarefa.id));
    return node;
  }

  function renderizar(scrollBottom = true) {
    lista.innerHTML = '';
    const fragment = document.createDocumentFragment();
    tarefas.forEach(t => fragment.appendChild(criarItem(t)));
    lista.appendChild(fragment);
    atualizarContador();
    bloquearSeLimite();
    if (scrollBottom) {
      lista.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  function adicionarTarefa(textoBruto) {
    const texto = capitalizar(textoBruto.trim());
    if (!texto) {
      setMensagem('Digite uma tarefa antes de adicionar.', 'erro');
      return;
    }
    if (tarefas.length >= LIMITE) {
      setMensagem('Você já tem ' + LIMITE + ' tarefas.', 'erro');
      return;
    }
    pushHistorico();
    const nova = { id: crypto.randomUUID(), texto };
    tarefas.push(nova);
    salvar();
    renderizar();
    setMensagem('Tarefa adicionada.', 'sucesso');
    form.reset();
    input.focus();
  }

  function removerTarefa(id) {
    const idx = tarefas.findIndex(t => t.id === id);
    if (idx >= 0) {
      pushHistorico();
      tarefas.splice(idx, 1);
      salvar();
      renderizar();
      setMensagem('Tarefa removida.', 'sucesso');
    }
  }

  function limparTudo() {
    if (!tarefas.length) { setMensagem('Não há tarefas para limpar.', 'erro'); return; }
    if (confirm('Remover todas as tarefas?')) {
      pushHistorico();
      tarefas = [];
      salvar();
      renderizar();
      setMensagem('Lista limpa.', 'sucesso');
    }
  }

  function iniciarEdicao(node, id) {
    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa) return;
    if (node.classList.contains('editando')) return;
    node.classList.add('editando');
    const span = node.querySelector('.texto');
    const antigo = tarefa.texto;
    const inputEdit = document.createElement('input');
    inputEdit.type = 'text';
    inputEdit.value = antigo;
    inputEdit.maxLength = 80;
    inputEdit.className = 'edicao';
    span.replaceWith(inputEdit);
    inputEdit.focus();
    inputEdit.select();

    const concluir = (confirmado) => {
      if (!node.isConnected) return; // já removido
      const valor = capitalizar(inputEdit.value.trim());
      if (confirmado && valor && valor !== antigo) {
        pushHistorico();
        tarefa.texto = valor;
        salvar();
        setMensagem('Tarefa editada.', 'sucesso');
      } else if (confirmado && !valor) {
        setMensagem('Texto não pode ser vazio.', 'erro');
        inputEdit.focus();
        return;
      }
      const spanNovo = document.createElement('span');
      spanNovo.className = 'texto';
      spanNovo.textContent = tarefa.texto;
      inputEdit.replaceWith(spanNovo);
      node.classList.remove('editando');
    };

    inputEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); concluir(true); }
      else if (e.key === 'Escape') { concluir(false); }
    });
    inputEdit.addEventListener('blur', () => concluir(true));
  }

  // Eventos
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    adicionarTarefa(input.value);
  });
  btnLimpar.addEventListener('click', limparTudo);
  btnUndo.addEventListener('click', restaurarUltimo);
  popupFechar.addEventListener('click', () => { fecharPopupLimite(); input.focus(); });
  popup.addEventListener('click', (e) => { if (e.target === popup) { fecharPopupLimite(); input.focus(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !popup.classList.contains('hidden')) { fecharPopupLimite(); input.focus(); } });

  input.addEventListener('input', () => {
    // feedback em tempo real de limite e vazio
    if (!input.value.trim()) {
      setMensagem('Campo vazio.', 'erro');
    } else if (tarefas.length >= LIMITE) {
      setMensagem('Limite atingido.', 'erro');
    } else {
      setMensagem('');
    }
  });

  // Inicialização
  tarefas = carregar();
  renderizar();
  btnUndo.disabled = historico.length === 0;
})();
