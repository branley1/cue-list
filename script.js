document.addEventListener('DOMContentLoaded', () => {
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        console.log('localStorage is working');
    } catch (e) {
        console.error('localStorage is not available:', e);
        alert('localStorage is not available. Todos will not be saved.');
    }

    if (typeof(Storage) === "undefined") {
        alert("Your browser doesn't support local storage. Your todos won't be saved!");
    }

    function getPriorityWeight(priority) {
        if (!priority) return 0;
        
        switch (priority.toLowerCase()) {
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 0;
        }
    }

    function sortTodosByPriority(todos) {
        return todos.sort((a, b) => {
            const priorityA = getPriorityWeight(a.priority);
            const priorityB = getPriorityWeight(b.priority);
            return priorityB - priorityA;
        });
    }

    const form = document.getElementById('todo-form');
    const input = document.getElementById('new-todo');
    const prioritySelect = document.getElementById('priority-select');
    const todoList = document.getElementById('todo-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search-todo';
    searchInput.placeholder = 'Search to-dos...';
    searchInput.className = 'search-input';
    form.insertBefore(searchInput, form.firstChild);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const todos = document.querySelectorAll('#todo-list li');
        
        todos.forEach(todo => {
            const text = todo.querySelector('.todo-content span').textContent.toLowerCase();
            todo.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    let currentFilter = 'all';

    // Add after other const declarations
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initialize theme
    const currentTheme = localStorage.getItem('theme') || 
        (prefersDark.matches ? 'dark' : 'light');
    document.body.classList.add(`${currentTheme}-theme`);
    updateThemeIcon(currentTheme);

    // Theme toggle handler
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        const newTheme = isDark ? 'light' : 'dark';
        
        document.body.classList.remove('dark-theme', 'light-theme');
        document.body.classList.add(`${newTheme}-theme`);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Load saved todos
    filterTodos();
    updateStats();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTodoText = input.value.trim();
        console.log('Adding new todo:', newTodoText);
        if (newTodoText !== '') {
            const newTodo = {
                id: Date.now(),
                text: newTodoText,
                completed: false,
                priority: prioritySelect.value,
                createdAt: new Date().toISOString()
            };
            saveTodoToLocalStorage(newTodo);
            filterTodos();
            input.value = '';
            updateStats();
        }
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTodos();
        });
    });

    clearCompletedBtn.addEventListener('click', () => {
        const completedTodos = document.querySelectorAll('.completed');
        completedTodos.forEach(todo => todo.remove());
        clearCompletedFromStorage();
        updateStats();
    });

    function addTodoToDOM(todo) {
        const li = document.createElement('li');
        li.dataset.id = todo.id;
        li.draggable = true;
        
        const todoContent = document.createElement('div');
        todoContent.className = 'todo-content';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        
        const text = document.createElement('span');
        text.textContent = todo.text;
        if (todo.completed) text.classList.add('completed');
        
        const priority = document.createElement('span');
        priority.className = `priority-badge priority-${todo.priority}`;
        priority.textContent = todo.priority;
        
        const dueDate = document.createElement('span');
        dueDate.className = 'due-date';
        dueDate.textContent = todo.dueDate ? new Date(todo.dueDate).toLocaleString() : '';
        
        const actions = document.createElement('div');
        actions.className = 'todo-actions';
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            li.remove();
            removeTodoFromLocalStorage(todo);
            updateStats();
        });

        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();

            const dialog = document.createElement('dialog');
            dialog.className = 'edit-dialog';
            
            dialog.innerHTML = `
                <form method="dialog" class="edit-form">
                    <input type="text" value="${todo.text}" id="edit-text">
                    <input type="datetime-local" value="${todo.dueDate || ''}" id="edit-date">
                    <select id="edit-priority">
                        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    <div class="dialog-buttons">
                        <button type="submit">Save</button>
                        <button type="button" class="cancel-btn">Cancel</button>
                    </div>
                </form>
            `;
            
            document.body.appendChild(dialog);
            dialog.showModal();
        
            const cancelBtn = dialog.querySelector('.cancel-btn');
            cancelBtn.addEventListener('click', () => {
                dialog.close();
                dialog.remove();
            });
        
            const form = dialog.querySelector('form');
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                
                const newText = dialog.querySelector('#edit-text').value.trim();
                const newDate = dialog.querySelector('#edit-date').value;
                const newPriority = dialog.querySelector('#edit-priority').value;
                
                if (newText !== '') {
                    todo.text = newText;
                    todo.dueDate = newDate;
                    todo.priority = newPriority;

                    text.textContent = newText;
                    dueDate.textContent = newDate ? new Date(newDate).toLocaleString() : '';
                    priority.textContent = newPriority;
                    priority.className = `priority-badge priority-${newPriority}`;
                    
                    updateTodoInLocalStorage(todo);
                    dialog.close();
                    dialog.remove();
                }
            });
        });

        todoContent.appendChild(checkbox);
        todoContent.appendChild(text);
        todoContent.appendChild(priority);
        todoContent.appendChild(dueDate);
        
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        
        li.appendChild(todoContent);
        li.appendChild(actions);

        checkbox.addEventListener('change', () => {
            todo.completed = checkbox.checked;
            text.classList.toggle('completed');
            updateTodoInLocalStorage(todo);
            updateStats();
        });

        if (shouldShowTodo(todo)) {
            todoList.appendChild(li);
        }
    }

    function updateStats() {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const totalTasks = todos.length;
        const completedTasks = todos.filter(todo => todo.completed).length;
        
        document.getElementById('total-tasks').textContent = `Total: ${totalTasks}`;
        document.getElementById('completed-tasks').textContent = `Completed: ${completedTasks}`;
    }

    function shouldShowTodo(todo) {
        switch(currentFilter) {
            case 'active':
                return !todo.completed;
            case 'completed':
                return todo.completed;
            default:
                return true;
        }
    }

    function filterTodos() {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        console.log('Current todos:', todos);
        todoList.innerHTML = '';
        const filteredTodos = todos.filter(todo => shouldShowTodo(todo));
        const sortedTodos = sortTodosByPriority(filteredTodos);
        sortedTodos.forEach(todo => addTodoToDOM(todo));
    }

    function saveTodoToLocalStorage(todo) {
        const validTodo = {
            id: todo.id || Date.now(),
            text: todo.text || '',
            completed: Boolean(todo.completed),
            priority: ['low', 'medium', 'high'].includes(todo.priority) ? todo.priority : 'low',
            createdAt: todo.createdAt || new Date().toISOString()
        };
        
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos.push(validTodo);
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function removeTodoFromLocalStorage(todo) {
        let todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos = todos.filter(t => t.id !== todo.id);
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function updateTodoInLocalStorage(updatedTodo) {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const todoIndex = todos.findIndex(t => t.id === updatedTodo.id);
        if (todoIndex > -1) {
            todos[todoIndex] = {
                ...updatedTodo,
                priority: ['low', 'medium', 'high'].includes(updatedTodo.priority) ? updatedTodo.priority : 'low'
            };
            localStorage.setItem('todos', JSON.stringify(todos));
        }
    }

    function clearCompletedFromStorage() {
        let todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos = todos.filter(todo => !todo.completed);
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    todoList.addEventListener('dragstart', (e) => {
        e.target.classList.add('dragging');
    });

    todoList.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
        updateTodosOrder();
    });

    todoList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const siblings = [...todoList.querySelectorAll('li:not(.dragging)')];
        const nextSibling = siblings.find(sibling => {
            return e.clientY <= sibling.offsetTop + sibling.offsetHeight / 2;
        });
        
        todoList.insertBefore(draggingItem, nextSibling);
    });

    function updateTodosOrder() {
        const todos = Array.from(todoList.children).map(li => {
            const id = li.dataset.id;
            return getTodoFromStorage(id);
        });
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    function getTodoFromStorage(id) {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        return todos.find(todo => todo.id == id);
    }
});

window.addEventListener('error', function(e) {
    if (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT') {
        console.warn('Resource failed to load:', e.target.src || e.target.href);
    }
}, true);