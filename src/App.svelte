<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { fade, slide } from "svelte/transition";
  import {
    Trash2,
    ChevronRight,
    GripVertical,
    Copy,
    Edit,
    Sun,
    Moon,
    Clock,
    X,
    Bell,
    Info,
    Coffee,
    Calendar,
  } from "lucide-svelte";

  interface Todo {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    showDateInput: boolean;
    alertEnabled: boolean;
    notificationId?: number;
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
  let isCreatingNewList = false;
  let showBulkInput = false;
  let editingListId: string | null = null;
  let editingListLabel = "";
  let darkMode = true;
  let use24HourFormat = false;
  let showAbout = false;
  let notificationPermission: NotificationPermission = "default";

  onMount(() => {
    loadData();
    window.addEventListener("beforeunload", saveData);
    const storedDarkMode = localStorage.getItem("darkMode");
    darkMode = storedDarkMode === null ? true : storedDarkMode === "true";
    use24HourFormat = localStorage.getItem("use24HourFormat") === "true";
    applyTheme();
    setupNotifications();
    return () => {
      window.removeEventListener("beforeunload", saveData);
    };
  });

  function applyTheme() {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode.toString());
  }

  function toggleDarkMode() {
    darkMode = !darkMode;
    applyTheme();
  }

  function toggleTimeFormat() {
    use24HourFormat = !use24HourFormat;
    localStorage.setItem("use24HourFormat", use24HourFormat.toString());
    lists = [...lists]; // Trigger a re-render
  }

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
        // Open the latest list by default
        if (lists.length > 0) {
          lists[0].expanded = true;
        }
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
    const targetList = lists.find((list) => list.id === listId);
    if (targetList) {
      targetList.todos = e.detail.items;
      lists = [...lists];
    }
  }

  function handleDndFinalize(
    e: CustomEvent<DndEvent<Todo>>,
    listId: string
  ): void {
    const targetList = lists.find((list) => list.id === listId);
    if (targetList) {
      targetList.todos = e.detail.items;
      lists = [...lists];
      saveData();
    }
  }

  function handleListDndConsider(e: CustomEvent<DndEvent<TodoList>>): void {
    lists = e.detail.items;
  }

  function handleListDndFinalize(e: CustomEvent<DndEvent<TodoList>>): void {
    lists = e.detail.items;
    saveData();
  }

  function toggleTodo(listId: string, todoId: string): void {
    lists = lists.map((list) => {
      if (list.id === listId) {
        const updatedTodos = list.todos.map((todo) =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        );
        const completedTodos = updatedTodos.filter((todo) => todo.completed);
        const incompleteTodos = updatedTodos.filter((todo) => !todo.completed);
        return { ...list, todos: [...incompleteTodos, ...completedTodos] };
      }
      return list;
    });
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
                : { ...todo, showDateInput: false }
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
      if (bulkInput.trim()) {
        addBulkTodos(newList.id);
      }
      isCreatingNewList = false;
      showBulkInput = false;
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
        alertEnabled: false,
      };
      lists = lists.map((list) =>
        list.id === listId ? { ...list, todos: [...list.todos, newTodo] } : list
      );
      newTodoText = "";
      saveData();
    }
  }

  function addBulkTodos(listId: string): void {
    if (bulkInput.trim()) {
      const newTodos = bulkInput
        .split("\n")
        .filter((text) => text.trim())
        .map((text) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: text.trim(),
          completed: false,
          showDateInput: false,
          alertEnabled: false,
        }));

      lists = lists.map((list) =>
        list.id === listId
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
    return d
      .toLocaleString(undefined, {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: use24HourFormat ? "2-digit" : "numeric",
        minute: "2-digit",
        hour12: !use24HourFormat,
      })
      .replace(",", "");
  }

  function handleNewListKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      createNewList();
    }
  }

  function handleNewTodoKeydown(event: KeyboardEvent, listId: string): void {
    if (event.key === "Enter") {
      addTodo(listId);
    }
  }

  function handleDateChange(e: Event, todo: Todo, listId: string): void {
    const target = e.target as HTMLInputElement;
    const localDate = new Date(target.value);
    todo.dueDate = localDate.toISOString();
    todo.showDateInput = false;
    saveData();
    if (todo.alertEnabled) {
      setupNotification(todo, listId);
    }
  }

  function toggleAlert(todo: Todo, listId: string): void {
    todo.alertEnabled = !todo.alertEnabled;
    saveData();
    if (todo.alertEnabled && todo.dueDate) {
      setupNotification(todo, listId);
    } else {
      removeNotification(todo.id);
    }
    lists = [...lists]; // Trigger a re-render
  }

  function getDateColor(date: string | undefined, completed: boolean): string {
    if (completed) return "text-gray-400 dark:text-gray-600";
    if (!date) return "text-gray-500 dark:text-gray-400";
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffHours < 0) return "text-red-500 dark:text-red-400";
    if (diffHours <= 24) return "text-yellow-500 dark:text-yellow-400";
    return "text-green-500 dark:text-green-400";
  }

  function deleteList(listId: string): void {
    lists = lists.filter((list) => list.id !== listId);
    saveData();
  }

  function copyList(listId: string): void {
    const listToCopy = lists.find((list) => list.id === listId);
    if (listToCopy) {
      const copiedList: TodoList = {
        ...listToCopy,
        id: Date.now().toString(),
        label: `${listToCopy.label} (Copy)`,
        todos: listToCopy.todos.map((todo) => ({
          ...todo,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        })),
      };
      lists = [copiedList, ...lists];
      saveData();
    }
  }

  function startEditingListName(listId: string): void {
    editingListId = listId;
    const list = lists.find((l) => l.id === listId);
    if (list) {
      editingListLabel = list.label;
    }
  }

  function saveEditingListName(): void {
    if (editingListId) {
      lists = lists.map((list) =>
        list.id === editingListId
          ? { ...list, label: editingListLabel.trim() }
          : list
      );
      editingListId = null;
      editingListLabel = "";
      saveData();
    }
  }

  async function setupNotifications() {
    if ("Notification" in window) {
      notificationPermission = await Notification.requestPermission();
    }
    lists.forEach((list) => {
      list.todos.forEach((todo) => {
        if (todo.dueDate && todo.alertEnabled) {
          setupNotification(todo, list.id);
        }
      });
    });
  }

  function setupNotification(todo: Todo, listId: string) {
    if (todo.dueDate) {
      const dueTime = new Date(todo.dueDate).getTime();
      const currentTime = new Date().getTime();
      const timeUntilDue = dueTime - currentTime;

      if (timeUntilDue > 0) {
        const notificationId = setTimeout(() => {
          showNotification(todo, listId);
        }, timeUntilDue);

        // Store the notification ID for potential cancellation
        todo.notificationId = notificationId;
      }
    }
  }

  function removeNotification(todoId: string) {
    lists = lists.map((list) => ({
      ...list,
      todos: list.todos.map((todo) => {
        if (todo.id === todoId && todo.notificationId) {
          clearTimeout(todo.notificationId);
          return { ...todo, notificationId: undefined };
        }
        return todo;
      }),
    }));
  }

  function showNotification(todo: Todo, listId: string) {
    if (notificationPermission === "granted") {
      new Notification("Todo Due", {
        body: `Your todo "${todo.text}" is due now!`,
      });
    }
    // You can also use chrome.notifications API for more advanced notifications
    if (typeof chrome !== "undefined" && chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Todo Due",
        message: `Your todo "${todo.text}" is due now!`,
        priority: 2,
      });
    }
  }

  function getLocalISOString(date: Date): string {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

  const handleTodoConsider = (e: CustomEvent<DndEvent<Todo>>, listId: string) =>
    handleDndConsider(e, listId);
  const handleTodoFinalize = (e: CustomEvent<DndEvent<Todo>>, listId: string) =>
    handleDndFinalize(e, listId);
  const handleNewTodoKeydownEvent = (e: KeyboardEvent, listId: string) =>
    handleNewTodoKeydown(e, listId);

  $: filteredLists = lists.map((list) => ({
    ...list,
    todos: (list.todos || []).filter(
      (todo) =>
        todo.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (showCompleted || !todo.completed)
    ),
  }));
</script>

<main
  class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200"
>
  <header class="bg-white dark:bg-gray-800 shadow-md p-4">
    <div class="max-w-4xl mx-auto flex justify-between items-center">
      <h1 class="text-xl font-bold text-blue-600 dark:text-white">
        Enhanced Todo List
      </h1>
      <div class="flex items-center space-x-4">
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={() => (showAbout = true)}
          aria-label="About"
          title="About"
        >
          <Info size={20} />
        </button>
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={toggleTimeFormat}
          aria-label={use24HourFormat
            ? "Switch to 12-hour format"
            : "Switch to 24-hour format"}
          title={use24HourFormat
            ? "Switch to 12-hour format"
            : "Switch to 24-hour format"}
        >
          <Clock size={20} />
        </button>
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {#if darkMode}
            <Sun size={20} class="text-white" />
          {:else}
            <Moon size={20} />
          {/if}
        </button>
      </div>
    </div>
  </header>

  <div class="flex-1 w-full max-w-4xl mx-auto p-4 overflow-y-auto">
    <div class="space-y-4">
      <div
        class="flex space-x-2 sticky top-0 bg-gray-100 dark:bg-gray-900 py-2"
      >
        <input
          class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
          placeholder="New list name"
          bind:value={newListLabel}
          on:keydown={handleNewListKeydown}
        />
        <button
          type="button"
          class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          on:click={() => (isCreatingNewList = true)}
        >
          Create List
        </button>
      </div>

      {#if isCreatingNewList}
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">Add Items to New List</h3>
              <button
                type="button"
                class="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 focus:outline-none"
                on:click={() => (showBulkInput = !showBulkInput)}
              >
                {showBulkInput ? "Add One by One" : "Bulk Add"}
              </button>
            </div>
            {#if showBulkInput}
              <textarea
                bind:value={bulkInput}
                placeholder="Enter multiple items, one per line"
                class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                rows="4"
              ></textarea>
            {:else}
              <input
                class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                placeholder="New todo item"
                bind:value={newTodoText}
                on:keydown={(e) => handleNewTodoKeydown(e, "new")}
              />
            {/if}
            <button
              type="button"
              class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
              on:click={createNewList}
            >
              Create List with Items
            </button>
          </div>
        </div>
      {/if}

      <div class="space-y-2">
        <section
          use:dndzone={{ items: filteredLists, flipDurationMs: 300 }}
          on:consider={handleListDndConsider}
          on:finalize={handleListDndFinalize}
        >
          {#each filteredLists as list, index (list.id)}
            <div animate:flip={{ duration: 300 }}>
              <div
                class="border dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2 bg-white dark:bg-gray-800"
              >
                <button
                  type="button"
                  class="w-full flex items-center justify-between p-3 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500 {index %
                    2 ===
                  0
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-gray-200 dark:bg-gray-700'}"
                  on:click={() => toggleListExpansion(list.id)}
                  title="Click to expand/collapse list"
                >
                  <div class="flex items-center space-x-2 flex-grow">
                    <GripVertical
                      size={16}
                      class="text-gray-400 dark:text-gray-500 cursor-move"
                    />
                    <div class="flex items-center space-x-2">
                      <ChevronRight
                        size={16}
                        class="transform transition-transform duration-200 {list.expanded
                          ? 'rotate-90'
                          : ''}"
                      />
                      {#if editingListId === list.id}
                        <input
                          bind:value={editingListLabel}
                          on:blur={saveEditingListName}
                          on:keydown={(e) =>
                            e.key === "Enter" && saveEditingListName()}
                          class="text-base font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 bg-yellow-100 dark:bg-yellow-900"
                        />
                      {:else}
                        <h2
                          class="text-base font-semibold text-gray-800 dark:text-gray-200 truncate"
                        >
                          {list.label}
                        </h2>
                      {/if}
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      class="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                      on:click|stopPropagation={() =>
                        startEditingListName(list.id)}
                      title="Edit list name"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      class="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 focus:outline-none"
                      on:click|stopPropagation={() => copyList(list.id)}
                      title="Copy list"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      class="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none"
                      on:click|stopPropagation={() => deleteList(list.id)}
                      title="Delete list"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </button>
                {#if list.expanded}
                  <div transition:slide|local={{ duration: 300 }}>
                    <div class="p-3 border-t dark:border-gray-700">
                      <div class="space-y-2">
                        <section
                          use:dndzone={{
                            items: list.todos || [],
                            flipDurationMs: 300,
                            dropTargetStyle: {
                              outline: "none",
                            },
                            dropFromOthersDisabled: true,
                          }}
                          on:consider={(e) => handleTodoConsider(e, list.id)}
                          on:finalize={(e) => handleTodoFinalize(e, list.id)}
                        >
                          {#each list.todos || [] as todo (todo.id)}
                            <div animate:flip={{ duration: 300 }}>
                              <div
                                class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                              >
                                <GripVertical
                                  size={16}
                                  class="text-gray-400 dark:text-gray-500 cursor-move mr-2"
                                />
                                <input
                                  type="checkbox"
                                  id={`todo-${todo.id}`}
                                  checked={todo.completed}
                                  on:change={() => toggleTodo(list.id, todo.id)}
                                  class="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out mr-2"
                                />
                                <label
                                  for={`todo-${todo.id}`}
                                  class="flex-grow text-sm {todo.completed
                                    ? 'line-through text-gray-500 dark:text-gray-400'
                                    : 'text-gray-800 dark:text-gray-200'} cursor-pointer"
                                >
                                  {todo.text}
                                </label>
                                <div class="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    class="flex items-center space-x-1 {getDateColor(
                                      todo.dueDate,
                                      todo.completed
                                    )} hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    on:click={() =>
                                      toggleDateInput(list.id, todo.id)}
                                    aria-label={todo.dueDate
                                      ? "Edit due date and time"
                                      : "Set due date and time"}
                                    title={todo.dueDate
                                      ? "Edit due date and time"
                                      : "Set due date and time"}
                                  >
                                    {#if todo.dueDate && !todo.completed}
                                      <Calendar size={16} />
                                      <span class="text-sm whitespace-nowrap">
                                        {formatDate(todo.dueDate)}
                                      </span>
                                    {:else}
                                      <Clock size={16} />
                                    {/if}
                                  </button>
                                  <button
                                    type="button"
                                    class="{todo.alertEnabled
                                      ? 'text-blue-500'
                                      : 'text-gray-400'} hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    on:click={() => toggleAlert(todo, list.id)}
                                    aria-label={todo.alertEnabled
                                      ? "Disable alert"
                                      : "Enable alert"}
                                    title={todo.alertEnabled
                                      ? "Disable alert"
                                      : "Enable alert"}
                                  >
                                    <Bell size={16} />
                                  </button>
                                </div>
                              </div>
                              {#if todo.showDateInput}
                                <div
                                  class="mt-2 ml-8 flex items-center space-x-2"
                                >
                                  <div class="relative flex-grow">
                                    <input
                                      type="datetime-local"
                                      value={todo.dueDate
                                        ? getLocalISOString(
                                            new Date(todo.dueDate)
                                          )
                                        : getLocalISOString(new Date())}
                                      on:change={(e) =>
                                        handleDateChange(e, todo, list.id)}
                                      class="w-full p-1 pr-8 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                    />
                                    <button
                                      type="button"
                                      class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                                      on:click={() =>
                                        toggleDateInput(list.id, todo.id)}
                                      aria-label="Close date input"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </section>
                      </div>
                      <div class="mt-3">
                        <input
                          class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                          placeholder="New todo item"
                          bind:value={newTodoText}
                          on:keydown={(e) =>
                            handleNewTodoKeydownEvent(e, list.id)}
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
            </div>
          {/each}
        </section>
      </div>
    </div>
  </div>

  {#if showAbout}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
      >
        <h2 class="text-2xl font-bold mb-4">About Enhanced Todo List</h2>
        <p class="mb-4">
          I hope you enjoy this simple yet powerful todo list! It's designed to
          help you stay organized and productive.
        </p>
        <p class="mb-4">
          If you find this app useful, consider supporting its development:
        </p>
        <div class="flex justify-between items-center">
          <a
            href="https://ko-fi.com/yourusername"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
          >
            <Coffee size={20} class="mr-2" />
            Buy me a coffee
          </a>
          <button
            class="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
            on:click={() => (showAbout = false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
  }

  :global(html.dark) {
    color-scheme: dark;
  }
</style>
