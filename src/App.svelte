<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { fade, fly } from "svelte/transition";

  interface Todo {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
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
  let searchQuery = "";
  let showCompleted = true;
  let expandedLists = false;

  function isCurrentListValid(list: TodoList | null): list is TodoList {
    return list !== null;
  }

  onMount(() => {
    loadData();
    window.addEventListener("beforeunload", saveData);
    return () => {
      window.removeEventListener("beforeunload", saveData);
    };
  });

  async function loadData(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get([
        "todoLists",
        "currentListId",
        "showCompleted",
      ]);
      if (result.todoLists) {
        lists = JSON.parse(result.todoLists);
        if (result.currentListId) {
          currentList =
            lists.find((list) => list.id === result.currentListId) || null;
        } else {
          currentList = null;
        }
      } else {
        lists = [];
        currentList = null;
      }
      showCompleted =
        result.showCompleted !== undefined ? result.showCompleted : true;
      await saveData();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async function saveData(): Promise<void> {
    try {
      const dataToSave = {
        todoLists: JSON.stringify(lists),
        currentListId: currentList?.id || null,
        showCompleted,
      };
      await chrome.storage.sync.set(dataToSave);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  function handleDndConsider(e: CustomEvent<{ items: Todo[] }>) {
    if (isCurrentListValid(currentList)) {
      currentList = { ...currentList, todos: e.detail.items };
    }
  }

  function handleDndFinalize(e: CustomEvent<{ items: Todo[] }>) {
    if (isCurrentListValid(currentList)) {
      const updatedTodos = e.detail.items;
      const updatedCurrentList: TodoList = {
        ...currentList,
        todos: updatedTodos,
      };
      lists = lists.map(
        (list): TodoList =>
          list.id === updatedCurrentList.id ? updatedCurrentList : list
      );
      currentList = updatedCurrentList;
      saveData();
    }
  }

  function handleListDndConsider(e: CustomEvent<{ items: TodoList[] }>) {
    lists = e.detail.items;
  }

  function handleListDndFinalize(e: CustomEvent<{ items: TodoList[] }>) {
    lists = e.detail.items;
    saveData();
  }

  function toggleTodo(listId: string, todoId: string): void {
    if (isCurrentListValid(currentList) && currentList.id === listId) {
      currentList.todos = currentList.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      );
      saveData();
    }
  }

  function handleTodoKeyPress(todo: Todo) {
    return (event: KeyboardEvent) => {
      if (event.key === "Enter" && currentList) {
        toggleTodo(currentList.id, todo.id);
      }
    };
  }

  async function createNewList(): Promise<void> {
    if (newListLabel.trim()) {
      const newList: TodoList = {
        id: Date.now().toString(),
        label: newListLabel.trim(),
        todos: [],
      };
      lists = [newList, ...lists];
      currentList = newList;
      newListLabel = "";
      await saveData();
    }
  }

  async function addTodo(): Promise<void> {
    if (newTodoText.trim() && isCurrentListValid(currentList)) {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: newTodoText.trim(),
        completed: false,
      };
      currentList.todos = [...currentList.todos, newTodo];
      lists = lists.map((list) =>
        list.id === currentList?.id
          ? { ...list, todos: currentList.todos }
          : list
      );
      newTodoText = "";
      await saveData();
    }
  }

  async function createTasksFromInput(): Promise<void> {
    if (isCurrentListValid(currentList) && bulkInput.trim()) {
      const newTasks: Todo[] = bulkInput
        .split(/\n|•|-/)
        .map((task) => task.trim())
        .filter((task) => task !== "")
        .map((task) => ({
          id: Date.now() + Math.random().toString(),
          text: task,
          completed: false,
        }));
      currentList.todos = [...currentList.todos, ...newTasks];
      lists = lists.map((list) =>
        list.id === currentList?.id
          ? { ...list, todos: currentList.todos }
          : list
      );
      bulkInput = "";
      await saveData();
    }
  }

  function handleNewListKeyPress(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      createNewList();
    }
  }

  function handleNewTodoKeyPress(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      addTodo();
    }
  }

  function handleBulkInputKeyPress(e: KeyboardEvent): void {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      createTasksFromInput();
    }
  }

  function startEditingList(listId: string): void {
    editingListId = listId;
    newListLabel = lists.find((list) => list.id === listId)?.label || "";
  }

  async function saveEditedList(): Promise<void> {
    if (editingListId && newListLabel.trim()) {
      lists = lists.map((list) =>
        list.id === editingListId
          ? { ...list, label: newListLabel.trim() }
          : list
      );
      if (isCurrentListValid(currentList) && currentList.id === editingListId) {
        currentList = { ...currentList, label: newListLabel.trim() };
      }
      editingListId = null;
      newListLabel = "";
      await saveData();
    }
  }

  async function deleteList(listId: string): Promise<void> {
    lists = lists.filter((list) => list.id !== listId);
    if (isCurrentListValid(currentList) && currentList.id === listId) {
      currentList = null;
    }
    await saveData();
  }

  $: filteredTodos = isCurrentListValid(currentList)
    ? currentList.todos.filter(
        (todo) =>
          todo.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
          (showCompleted || !todo.completed)
      )
    : [];

  $: visibleLists = expandedLists ? lists : lists.slice(0, 5);
  $: hiddenListsCount = Math.max(0, lists.length - 5);
</script>

<main class="flex flex-col h-screen">
  <div class="flex-1 w-full max-w-md mx-auto p-4 bg-gray-100 overflow-y-auto">
    <h1
      class="text-3xl font-bold mb-6 text-center text-blue-600 sticky top-0 bg-gray-100 py-2"
    >
      Enhanced Todo List
    </h1>

    <div class="space-y-4">
      <div class="flex space-x-2 sticky top-14 bg-gray-100 py-2">
        <input
          class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="New list name"
          bind:value={newListLabel}
          on:keydown={handleNewListKeyPress}
        />
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          on:click={createNewList}
        >
          Create List
        </button>
      </div>

      <div class="space-y-2">
        <section
          use:dndzone={{ items: visibleLists, flipDurationMs: 300 }}
          on:consider={handleListDndConsider}
          on:finalize={handleListDndFinalize}
        >
          {#each visibleLists as list (list.id)}
            <div
              animate:flip={{ duration: 300 }}
              class="bg-white border rounded-lg p-2 mb-2 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between"
            >
              <h2
                class="text-lg font-semibold text-gray-800 truncate flex-grow"
              >
                {list.label}
              </h2>
              <div class="flex space-x-1">
                <button
                  class="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
                  on:click={() => (currentList = list)}
                  title="Select List"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
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
                  on:click={() => startEditingList(list.id)}
                  title="Edit List"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
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
                  title="Delete List"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
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
          {/each}
        </section>
        {#if hiddenListsCount > 0}
          <div class="text-center">
            <button
              class="text-blue-600 hover:text-blue-800 focus:outline-none"
              on:click={() => (expandedLists = !expandedLists)}
            >
              {expandedLists
                ? "Show less"
                : `Show ${hiddenListsCount} more list${
                    hiddenListsCount > 1 ? "s" : ""
                  }`}
            </button>
          </div>
        {/if}
      </div>

      {#if isCurrentListValid(currentList)}
        <div
          class="bg-white border rounded-lg p-4 mt-4 shadow-md flex flex-col"
          transition:fade={{ duration: 200 }}
        >
          <h3 class="font-semibold mb-3 text-xl text-blue-600">
            Current List: {currentList.label}
          </h3>
          <div class="mb-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search todos"
              bind:value={searchQuery}
              class="flex-grow p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                bind:checked={showCompleted}
                on:change={saveData}
                class="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>Show Completed</span>
            </label>
          </div>
          <div class="space-y-2 mb-4 overflow-y-auto max-h-[400px] pr-2">
            <section
              use:dndzone={{ items: filteredTodos, flipDurationMs: 300 }}
              on:consider={handleDndConsider}
              on:finalize={handleDndFinalize}
            >
              {#each filteredTodos as todo (todo.id)}
                <div
                  animate:flip={{ duration: 300 }}
                  class="flex items-center space-x-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                  on:click={() => toggleTodo(currentList.id, todo.id)}
                  on:keydown={handleTodoKeyPress(todo)}
                  tabindex="0"
                  role="checkbox"
                  aria-checked={todo.completed}
                  transition:fly={{ y: 20, duration: 200 }}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    on:change={() => toggleTodo(currentList.id, todo.id)}
                    class="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                  />
                  <span
                    class="flex-grow {todo.completed
                      ? 'line-through text-gray-500'
                      : 'text-gray-800'}"
                  >
                    {todo.text}
                  </span>
                  <input
                    type="date"
                    bind:value={todo.dueDate}
                    on:change={saveData}
                    class="p-1 border rounded text-sm"
                  />
                </div>
              {/each}
            </section>
          </div>
          <div class="space-y-2 bg-white pt-2">
            <input
              class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="New todo item"
              bind:value={newTodoText}
              on:keydown={handleNewTodoKeyPress}
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
              on:keydown={handleBulkInputKeyPress}
            />
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
  </div>
</main>

<style>
  :global(body) {
    background-color: #f0f0f0;
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
  }
</style>
