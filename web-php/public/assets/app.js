// Melhoria progressiva: o painel funciona sem JavaScript; aqui só há atalhos de conforto.
document.querySelectorAll('select[data-autosubmit]').forEach((select) => {
  select.addEventListener('change', () => select.form.requestSubmit());
});

// Contador de caracteres do título no formulário de nova tarefa.
document.querySelectorAll('[data-counter]').forEach((input) => {
  const counter = document.getElementById(input.dataset.counter);
  const update = () => { counter.textContent = `${[...input.value].length}/${input.maxLength}`; };
  input.addEventListener('input', update);
});
