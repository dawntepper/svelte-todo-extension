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

  function toggleTodo(listId: string, todoId: string): void {
    if (isCurrentListValid(currentList)) {
      const todo = currentList.todos.find((t) => t.id === todoId);
      if (todo) {
        todo.completed = !todo.completed;
      }
    }
  }

  function handleTodoKeyPress(todo: Todo) {
    return (event: KeyboardEvent) => {
      if (event.key === "Enter" && currentList) {
        toggleTodo(currentList.id, todo.id);
      }
    };
  }

  // ... (keep your existing functions)

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
      <!-- ... (previous HTML code) -->

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
                  on:click={() =>
                    currentList && toggleTodo(currentList.id, todo.id)}
                  on:keydown={handleTodoKeyPress(todo)}
                  tabindex="0"
                  role="checkbox"
                  aria-checked={todo.completed}
                  transition:fly={{ y: 20, duration: 200 }}
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
          <!-- ... (rest of your HTML code) -->
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
