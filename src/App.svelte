<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { fade, fly, slide } from "svelte/transition";
  import { Calendar, CalendarDays } from "lucide-svelte";

  interface Todo {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    showDateInput: boolean;
  }

  interface TodoList {
    id: string;
    label: string;
    todos: Todo[];
    expanded: boolean;
  }

  let lists: TodoList[] = [];
  let newListLabel = "";
  let newTodoText = "";
  let bulkInput = "";
  let searchQuery = "";
  let showCompleted = true;
  let selectedListId: string | null = null;

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
        "showCompleted",
      ]);
      if (result.todoLists) {
        lists = JSON.parse(result.todoLists).map((list: TodoList) => ({
          ...list,
          expanded: false,
          todos: list.todos.map((todo: Todo) => ({
            ...todo,
            showDateInput: false,
          })),
        }));
      } else {
        lists = [];
      }
      showCompleted =
        result.showCompleted !== undefined ? result.showCompleted : true;
      saveData();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  function saveData(): void {
    try {
      const dataToSave = {
        todoLists: JSON.stringify(lists),
        showCompleted,
      };
      chrome.storage.sync.set(dataToSave);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  function handleDndConsider(
    e: CustomEvent<DndEvent<Todo>>,
    listId: string
  ): void {
    lists = lists.map((list) =>
      list.id === listId ? { ...list, todos: e.detail.items } : list
    );
  }

  function handleDndFinalize(
    e: CustomEvent<DndEvent<Todo>>,
    listId: string
  ): void {
    lists = lists.map((list) =>
      list.id === listId ? { ...list, todos: e.detail.items } : list
    );
    saveData();
  }

  function handleListDndConsider(e: CustomEvent<DndEvent<TodoList>>): void {
    lists = e.detail.items;
  }

  function handleListDndFinalize(e: CustomEvent<DndEvent<TodoList>>): void {
    lists = e.detail.items;
    saveData();
  }

  function toggleTodo(listId: string, todoId: string): void {
    lists = lists.map((list) =>
      list.id === listId
        ? {
            ...list,
            todos: list.todos.map((todo) =>
              todo.id === todoId
                ? { ...todo, completed: !todo.completed }
                : todo
            ),
          }
        : list
    );
    saveData();
  }

  function toggleDateInput(listId: string, todoId: string): void {
    lists = lists.map((list) =>
      list.id === listId
        ? {
            ...list,
            todos: list.todos.map((todo) =>
              todo.id === todoId
                ? { ...todo, showDateInput: !todo.showDateInput }
                : todo
            ),
          }
        : list
    );
  }

  function createNewList(): void {
    if (newListLabel.trim()) {
      const newList: TodoList = {
        id: Date.now().toString(),
        label: newListLabel.trim(),
        todos: [],
        expanded: true,
      };
      lists = [newList, ...lists];
      newListLabel = "";
      saveData();
    }
  }

  function addTodo(listId: string): void {
    if (newTodoText.trim()) {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: newTodoText.trim(),
        completed: false,
        showDateInput: false,
      };
      lists = lists.map((list) =>
        list.id === listId ? { ...list, todos: [...list.todos, newTodo] } : list
      );
      newTodoText = "";
      saveData();
    }
  }

  function addBulkTodos(): void {
    if (selectedListId && bulkInput.trim()) {
      const newTodos = bulkInput
        .split("\n")
        .filter((text) => text.trim())
        .map((text) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          completed: false,
          showDateInput: false,
        }));

      lists = lists.map((list) =>
        list.id === selectedListId
          ? { ...list, todos: [...list.todos, ...newTodos] }
          : list
      );
      bulkInput = "";
      saveData();
    }
  }

  function toggleListExpansion(listId: string): void {
    lists = lists.map((list) =>
      list.id === listId ? { ...list, expanded: !list.expanded } : list
    );
  }

  function formatDate(date: string | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleNewListKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      createNewList();
    }
  }

  function handleDateChange(e: Event, todo: Todo): void {
    const target = e.currentTarget as HTMLInputElement; // Type assertion
    if (target) {
      // Null check
      todo.dueDate = target.value;
      saveData();
    }
  }

  function handleNewTodoKeydown(e: KeyboardEvent, listId: string) {
    if (e.key === "Enter") {
      addTodo(listId);
    }
  }

  function getDateColor(date: string | undefined): string {
    if (!date) return "text-gray-500";
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-red-500";
    if (diffDays === 0) return "text-yellow-500";
    if (diffDays <= 3) return "text-orange-500";
    return "text-green-500";
  }

  const handleTodoConsider = (e: CustomEvent<DndEvent<Todo>>, listId: string) =>
    handleDndConsider(e, listId);
  const handleTodoFinalize = (e: CustomEvent<DndEvent<Todo>>, listId: string) =>
    handleDndFinalize(e, listId);
  const handleNewTodoKeydownEvent = (e: KeyboardEvent, listId: string) =>
    handleNewTodoKeydown(e, listId);

  $: filteredLists = lists.map((list) => ({
    ...list,
    todos: list.todos.filter(
      (todo) =>
        todo.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (showCompleted || !todo.completed)
    ),
  }));
</script>

<main class="flex flex-col h-screen">
  <div class="flex-1 w-full max-w-4xl mx-auto p-4 bg-gray-100 overflow-y-auto">
    <h1
      class="text-3xl font-bold mb-6 text-center text-blue-600 sticky top-0 bg-gray-100 py-2"
    >
      Enhanced Todo List
    </h1>

    <div class="space-y-6">
      <div class="flex space-x-2 sticky top-14 bg-gray-100 py-2">
        <input
          class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="New list name"
          bind:value={newListLabel}
          on:keydown={handleNewListKeydown}
        />
        <button
          type="button"
          class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          on:click={createNewList}
        >
          Create List
        </button>
      </div>

      <div class="bg-white p-4 rounded-lg shadow">
        <div class="space-y-2">
          <select
            bind:value={selectedListId}
            class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a list or create new</option>
            {#each lists as list}
              <option value={list.id}>{list.label}</option>
            {/each}
          </select>
          <textarea
            bind:value={bulkInput}
            placeholder="Enter multiple items, one per line"
            class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
          ></textarea>
          <button
            type="button"
            class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
            on:click={selectedListId ? addBulkTodos : createNewList}
          >
            {selectedListId ? "Add Items" : "Create New List"}
          </button>
        </div>
      </div>

      <div class="space-y-4">
        <section
          use:dndzone={{ items: filteredLists, flipDurationMs: 300 }}
          on:consider={handleListDndConsider}
          on:finalize={handleListDndFinalize}
        >
          {#each filteredLists as list (list.id)}
            <div
              animate:flip={{ duration: 300 }}
              class="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between p-4 cursor-pointer text-left"
                on:click={() => toggleListExpansion(list.id)}
              >
                <h2 class="text-xl font-semibold text-gray-800 truncate">
                  {list.label}
                </h2>
                <span
                  class="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
                  title={list.expanded ? "Collapse" : "Expand"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d={list.expanded
                        ? "M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                        : "M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"}
                      clip-rule="evenodd"
                    />
                  </svg>
                </span>
              </button>
              {#if list.expanded}
                <div transition:slide|local>
                  <div class="p-4 border-t">
                    <div class="space-y-2">
                      <section
                        use:dndzone={{ items: list.todos, flipDurationMs: 300 }}
                        on:consider={(e) => handleTodoConsider(e, list.id)}
                        on:finalize={(e) => handleTodoFinalize(e, list.id)}
                      >
                        {#each list.todos as todo (todo.id)}
                          <div
                            animate:flip={{ duration: 300 }}
                            class="flex flex-col p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors duration-200"
                          >
                            <div class="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id={`todo-${todo.id}`}
                                checked={todo.completed}
                                on:change={() => toggleTodo(list.id, todo.id)}
                                class="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                              />
                              <label
                                for={`todo-${todo.id}`}
                                class="flex-grow {todo.completed
                                  ? 'line-through text-gray-500'
                                  : 'text-gray-800'} cursor-pointer"
                              >
                                {todo.text}
                                {#if todo.dueDate}
                                  <span
                                    class="ml-2 text-sm {getDateColor(
                                      todo.dueDate
                                    )}"
                                  >
                                    | {formatDate(todo.dueDate)}
                                  </span>
                                {/if}
                              </label>
                              <button
                                type="button"
                                class="{getDateColor(
                                  todo.dueDate
                                )} hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                on:click={() =>
                                  toggleDateInput(list.id, todo.id)}
                                aria-label={todo.showDateInput
                                  ? "Hide date input"
                                  : "Show date input"}
                              >
                                <CalendarDays size={20} />
                              </button>
                            </div>
                            {#if todo.showDateInput}
                              <div class="mt-2 flex items-center space-x-2">
                                <input
                                  type="date"
                                  value={todo.dueDate || ""}
                                  on:change={(e) => handleDateChange(e, todo)}
                                  class="p-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </section>
                    </div>
                    <div class="mt-4">
                      <input
                        class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="New todo item"
                        bind:value={newTodoText}
                        on:keydown={(e) => handleNewTodoKeydown(e, list.id)}
                      />
                      <button
                        type="button"
                        class="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
                        on:click={() => addTodo(list.id)}
                      >
                        Add Todo
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </section>
      </div>
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
