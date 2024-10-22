<script lang="ts">
  import { onMount } from "svelte";

  interface Todo {
    id: string;
    text: string;
    completed: boolean;
  }

  interface TodoList {
    id: string;
    label: string;
    todos: Todo[];
  }

  let lists: TodoList[] = [];
  let currentList: TodoList | null = null;
  let newListLabel = "";
  let newTodoText = "";
  let bulkInput = "";
  let editingListId: string | null = null;

  onMount(() => {
    const savedLists = localStorage.getItem("todoLists");
    if (savedLists) {
      lists = JSON.parse(savedLists);
    }
  });

  $: {
    localStorage.setItem("todoLists", JSON.stringify(lists));
  }

  function createNewList() {
    if (newListLabel.trim()) {
      const newList: TodoList = {
        id: Date.now().toString(),
        label: newListLabel.trim(),
        todos: [],
      };
      lists = [newList, ...lists];
      currentList = newList;
      newListLabel = "";
    }
  }

  function selectList(list: TodoList) {
    currentList = list;
  }

  function editList(list: TodoList) {
    startEditingList(list.id);
  }

  function addTodo() {
    if (newTodoText.trim() && currentList) {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: newTodoText.trim(),
        completed: false,
      };
      currentList.todos = [...currentList.todos, newTodo];
      lists = [...lists];
      newTodoText = "";
    }
  }

  function createTasksFromInput() {
    if (currentList && bulkInput.trim()) {
      const newTasks = bulkInput
        .split(/\n|•|-/)
        .map((task) => task.trim())
        .filter((task) => task !== "")
        .map((task) => ({
          id: Date.now() + Math.random().toString(),
          text: task,
          completed: false,
        }));
      currentList.todos = [...currentList.todos, ...newTasks];
      lists = [...lists];
      bulkInput = "";
    }
  }

  function toggleTodo(listId: string, todoId: string) {
    lists = lists.map((list) => {
      if (list.id === listId) {
        return {
          ...list,
          todos: list.todos.map((todo) =>
            todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
          ),
        };
      }
      return list;
    });
    if (currentList && currentList.id === listId) {
      currentList = lists.find((list) => list.id === listId) || null;
    }
  }

  function deleteList(listId: string) {
    lists = lists.filter((list) => list.id !== listId);
    if (currentList && currentList.id === listId) {
      currentList = null;
    }
  }

  function startEditingList(listId: string) {
    editingListId = listId;
    newListLabel = lists.find((list) => list.id === listId)?.label || "";
  }

  function saveEditedList() {
    if (editingListId && newListLabel.trim()) {
      lists = lists.map((list) =>
        list.id === editingListId
          ? { ...list, label: newListLabel.trim() }
          : list
      );
      if (currentList && currentList.id === editingListId) {
        currentList = { ...currentList, label: newListLabel.trim() };
      }
      editingListId = null;
      newListLabel = "";
    }
  }

  function handleSelectKeyPress(list: TodoList) {
    return (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectList(list);
      }
    };
  }

  function handleEditKeyPress(list: TodoList) {
    return (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        editList(list);
      }
    };
  }

  function handleDeleteKeyPress(list: TodoList) {
    return (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        deleteList(list.id);
      }
    };
  }

  function handleTodoKeyPress(todo: Todo) {
    return (e: KeyboardEvent) => {
      if (currentList && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        toggleTodo(currentList.id, todo.id);
      }
    };
  }
</script>

<main class="w-full max-w-md mx-auto p-4 bg-gray-100 rounded-lg shadow-lg">
  <h1 class="text-3xl font-bold mb-6 text-center text-blue-600">
    Enhanced Todo List
  </h1>

  <div class="space-y-4">
    <div class="flex space-x-2">
      <input
        class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="New list name"
        bind:value={newListLabel}
      />
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
        on:click={editingListId ? saveEditedList : createNewList}
      >
        {editingListId ? "Save" : "Create List"}
      </button>
    </div>

    {#each lists as list (list.id)}
      <div
        class="bg-white border rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">{list.label}</h2>
          <div class="flex space-x-2">
            <button
              class="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
              on:click={() => selectList(list)}
              on:keydown={handleSelectKeyPress(list)}
              title="Select List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <button
              class="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-700 focus:ring-offset-2"
              on:click={() => editList(list)}
              on:keydown={handleEditKeyPress(list)}
              title="Edit List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                />
              </svg>
            </button>
            <button
              class="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
              on:click={() => deleteList(list.id)}
              on:keydown={handleDeleteKeyPress(list)}
              title="Delete List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    {/each}

    {#if currentList}
      <div class="bg-white border rounded-lg p-4 mt-4 shadow-md">
        <h3 class="font-semibold mb-3 text-xl text-blue-600">
          Current List: {currentList.label}
        </h3>
        <div class="space-y-2 mb-4">
          {#each currentList.todos as todo (todo.id)}
            <div
              class="flex items-center space-x-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              on:click={() =>
                currentList && toggleTodo(currentList.id, todo.id)}
              on:keydown={handleTodoKeyPress(todo)}
              tabindex="0"
              role="checkbox"
              aria-checked={todo.completed}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                on:change={() =>
                  currentList && toggleTodo(currentList.id, todo.id)}
                class="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
              />
              <span
                class="flex-grow {todo.completed
                  ? 'line-through text-gray-500'
                  : 'text-gray-800'}"
              >
                {todo.text}
              </span>
            </div>
          {/each}
        </div>
        <div class="space-y-2">
          <input
            class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="New todo item"
            bind:value={newTodoText}
          />
          <button
            class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
            on:click={addTodo}
          >
            Add Todo
          </button>
          <textarea
            class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter multiple tasks (one per line)"
            bind:value={bulkInput}
          ></textarea>
          <button
            class="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:ring-offset-2"
            on:click={createTasksFromInput}
          >
            Add Bulk Tasks
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    background-color: #f0f0f0;
  }
</style>
