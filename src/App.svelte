<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import { fade, slide } from "svelte/transition";
  import confetti from "canvas-confetti";
  import QRCode from "qrcode";
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
    Coffee,
    Calendar,
    Search,
    Filter,
    Share2,
    AlertTriangle,
    Menu,
    MessageSquare,
  } from "lucide-svelte";

  interface Todo {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    showDateInput: boolean;
    readOnly?: boolean;
    note?: string;
    showNote?: boolean;
    createdAt: number;
  }

  interface TodoList {
    id: string;
    label: string;
    todos: Todo[];
    expanded: boolean;
    note?: string;
    createdAt: number;
  }

  interface ShareOptions {
    expirationTime: number | null;
    isEditable: boolean;
  }

  let lists: TodoList[] = [];
  let newListLabel = "";
  let editingNoteId: string | null = null;
  let editingNote = "";
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
  let showSearch = false;
  let showFilters = false;
  let sortBy: "default" | "dueDate" | "alphabetical" | "creationDate" =
    "default";
  let showShareModal = false;
  let shareUrl = "";
  let shortShareUrl = "";
  let qrCodeDataUrl = "";
  let shareOptions: ShareOptions = {
    expirationTime: null,
    isEditable: false,
  };
  let showShareFeedback = false;
  let shareFeedback = "";
  let showLeftNav = false;
  let showFeedbackModal = false;
  let hoveredElement: string | null = null;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get("data");
    const sharedExpiration = urlParams.get("expiration");
    const sharedEditable = urlParams.get("editable");

    if (sharedData) {
      try {
        const currentTime = new Date().getTime();
        if (sharedExpiration && parseInt(sharedExpiration) < currentTime) {
          alert("This shared list has expired.");
        } else {
          const decodedData = JSON.parse(decodeURIComponent(atob(sharedData)));
          lists = decodedData;
          if (sharedEditable === "true") {
            // Allow editing
          } else {
            // Make the list read-only
            lists = lists.map((list) => ({
              ...list,
              todos: list.todos.map((todo) => ({ ...todo, readOnly: true })),
            }));
          }
          saveData();
        }
      } catch (error) {
        console.error("Error parsing shared data:", error);
      }
    } else {
      loadData();
    }

    window.addEventListener("beforeunload", saveData);
    const storedDarkMode = localStorage.getItem("darkMode");
    darkMode = storedDarkMode === null ? true : storedDarkMode === "true";
    use24HourFormat = localStorage.getItem("use24HourFormat") === "true";
    applyTheme();
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
            showNote: false,
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
        // Sort todos to move completed items to the bottom
        updatedTodos.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
        return { ...list, todos: updatedTodos };
      }
      return list;
    });

    // Check if all todos in the list are completed
    const currentList = lists.find((list) => list.id === listId);
    if (currentList && currentList.todos.every((todo) => todo.completed)) {
      triggerConfetti();
    }

    saveData();
  }

  function triggerConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
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
        createdAt: Date.now(),
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

  async function addTodo(listId: string): Promise<void> {
    if (newTodoText.trim()) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let todoText = newTodoText.trim();

      const matches = todoText.match(urlRegex);
      if (matches) {
        for (const url of matches) {
          const title = await fetchUrlMetadata(url);
          const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
          todoText = todoText.replace(url, linkHtml);
        }
      }

      const newTodo: Todo = {
        id: Date.now().toString(),
        text: todoText,
        completed: false,
        showDateInput: false,
        createdAt: Date.now(),
        showNote: false,
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
          createdAt: Date.now(),
          showNote: false,
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
    if (event.key === "Enter" && newListLabel.trim()) {
      event.preventDefault();
      isCreatingNewList = true;
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
    saveData();
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
        createdAt: Date.now(),
      };
      lists = [copiedList, ...lists];
      saveData();
    }
  }

  function copyTodoText(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Todo text copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
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

  function startEditingNote(listId: string): void {
    editingNoteId = listId;
    const list = lists.find((l) => l.id === listId);
    if (list) {
      editingNote = list.note || "";
    }
  }

  function saveEditingNote(): void {
    if (editingNoteId) {
      lists = lists.map((list) =>
        list.id === editingNoteId ? { ...list, note: editingNote.trim() } : list
      );
      editingNoteId = null;
      editingNote = "";
      saveData();
    }
  }

  function toggleTodoNote(listId: string, todoId: string): void {
    lists = lists.map((list) =>
      list.id === listId
        ? {
            ...list,
            todos: list.todos.map((todo) =>
              todo.id === todoId ? { ...todo, showNote: !todo.showNote } : todo
            ),
          }
        : list
    );
  }

  function updateTodoNote(
    listId: string,
    todoId: string,
    newNote: string
  ): void {
    lists = lists.map((list) =>
      list.id === listId
        ? {
            ...list,
            todos: list.todos.map((todo) =>
              todo.id === todoId ? { ...todo, note: newNote.trim() } : todo
            ),
          }
        : list
    );
    saveData();
  }

  function getLocalISOString(date: Date): string {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

  function toggleSearch() {
    showSearch = !showSearch;
    if (!showSearch) {
      searchQuery = "";
    }
  }

  function closeSearch() {
    showSearch = false;
    searchQuery = "";
  }

  function toggleFilters() {
    showFilters = !showFilters;
  }

  function setSortBy(
    sort: "default" | "dueDate" | "alphabetical" | "creationDate"
  ) {
    sortBy = sort;
  }

  async function generateShareableLink() {
    const data = JSON.stringify(lists);
    const encodedData = btoa(encodeURIComponent(data));
    const expirationParam = shareOptions.expirationTime
      ? `&expiration=${shareOptions.expirationTime}`
      : "";
    const editableParam = `&editable=${shareOptions.isEditable}`;
    shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}${expirationParam}${editableParam}`;

    // Shorten the URL
    shortShareUrl = await shortenUrl(shareUrl);

    try {
      qrCodeDataUrl = await QRCode.toDataURL(shortShareUrl, {
        width: 300,
        margin: 2,
      });
    } catch (err) {
      console.error("Error generating QR code:", err);
      qrCodeDataUrl = "";
    }

    showShareModal = true;

    // Track usage
    trackShareUsage();
  }

  async function shortenUrl(longUrl: string): Promise<string> {
    // This is a placeholder function. You'll need to implement an actual URL shortening service.
    // For demonstration, we're just returning a fake shortened URL.
    // In a real implementation, you would make an API call to a URL shortening service.
    return `https://short.url/${Math.random().toString(36).substr(2, 8)}`;
  }

  function trackShareUsage() {
    // Implement your analytics tracking here
    console.log("Share feature used");
  }

  function copyShareableLink() {
    navigator.clipboard
      .writeText(shortShareUrl)
      .then(() => {
        alert("Shortened link copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy link: ", err);
      });
  }

  function submitShareFeedback() {
    // Implement your feedback submission logic here
    console.log("Share feedback:", shareFeedback);
    showShareFeedback = false;
    shareFeedback = "";
  }

  function toggleLeftNav() {
    showLeftNav = !showLeftNav;
  }

  function closeLeftNav() {
    showLeftNav = false;
  }

  function toggleFeedbackModal() {
    showFeedbackModal = !showFeedbackModal;
    if (showLeftNav) closeLeftNav();
  }

  function handleListKeydown(event: KeyboardEvent, listId: string) {
    if (event.key === "Enter" || event.key === " ") {
      toggleListExpansion(listId);
    }
  }

  function getListHeaderBackgroundColor(index: number): string {
    return index % 2 === 0
      ? "bg-white dark:bg-gray-800"
      : "bg-gray-50 dark:bg-gray-750";
  }

  function handleEditInputClick(event: MouseEvent) {
    event.stopPropagation();
  }

  async function fetchUrlMetadata(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      const title = doc.querySelector("title");

      if (ogTitle && ogTitle.getAttribute("content")) {
        return ogTitle.getAttribute("content") || "";
      } else if (title && title.textContent) {
        return title.textContent;
      } else {
        return url;
      }
    } catch (error) {
      console.error("Error fetching URL metadata:", error);
      return url;
    }
  }

  const handleTodoConsider = (e: CustomEvent<DndEvent<Todo>>, listId: string) =>
    handleDndConsider(e, listId);
  const handleTodoFinalize = (e: CustomEvent<DndEvent<Todo>>, listId: string) =>
    handleDndFinalize(e, listId);
  const handleNewTodoKeydownEvent = (e: KeyboardEvent, listId: string) =>
    handleNewTodoKeydown(e, listId);

  $: filteredLists = lists.map((list) => ({
    ...list,
    todos: (list.todos || [])
      .filter(
        (todo) =>
          todo.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
          (showCompleted || !todo.completed)
      )
      .sort((a, b) => {
        if (sortBy === "dueDate") {
          return (a.dueDate || "").localeCompare(b.dueDate || "");
        } else if (sortBy === "alphabetical") {
          return a.text.localeCompare(b.text);
        } else if (sortBy === "creationDate") {
          return a.createdAt - b.createdAt;
        }
        return 0;
      }),
  }));

  $: hasDueDates = lists.some((list) =>
    list.todos.some((todo) => todo.dueDate)
  );
  $: if (!hasDueDates && sortBy === "dueDate") {
    sortBy = "creationDate";
  }
</script>

<main
  class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200"
>
  <header class="bg-white dark:bg-gray-800 shadow-md">
    <div class="max-w-4xl mx-auto flex justify-between items-center px-4">
      <div class="flex items-center space-x-2 py-4">
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={toggleLeftNav}
          on:mouseenter={() => (hoveredElement = "menu")}
          on:mouseleave={() => (hoveredElement = null)}
        >
          <Menu size={24} />
          {#if hoveredElement === "menu"}
            <div
              class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
            >
              Menu
            </div>
          {/if}
        </button>
        <a
          href="https://ko-fi.com/yourusername"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:mouseenter={() => (hoveredElement = "coffee")}
          on:mouseleave={() => (hoveredElement = null)}
        >
          <Coffee size={24} class="text-blue-600 dark:text-white" />
          {#if hoveredElement === "coffee"}
            <div
              class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
            >
              Support on Ko-fi
            </div>
          {/if}
        </a>
        <h1
          class="text-2xl font-bold text-blue-600 dark:text-white whitespace-nowrap"
        >
          Just A List
        </h1>
      </div>
      <div class="flex items-center space-x-4 py-4">
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={toggleSearch}
          on:mouseenter={() => (hoveredElement = "search")}
          on:mouseleave={() => (hoveredElement = null)}
        >
          <Search size={20} />
          {#if hoveredElement === "search"}
            <div
              class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
            >
              Toggle search
            </div>
          {/if}
        </button>
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={toggleFilters}
          on:mouseenter={() => (hoveredElement = "filter")}
          on:mouseleave={() => (hoveredElement = null)}
        >
          <Filter size={20} />
          {#if hoveredElement === "filter"}
            <div
              class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
            >
              Toggle filters
            </div>
          {/if}
        </button>
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={generateShareableLink}
          on:mouseenter={() => (hoveredElement = "share")}
          on:mouseleave={() => (hoveredElement = null)}
        >
          <Share2 size={20} />
          {#if hoveredElement === "share"}
            <div
              class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
            >
              Share list
            </div>
          {/if}
        </button>
        <button
          class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={() => (showAbout = true)}
          on:mouseenter={() => (hoveredElement = "about")}
          on:mouseleave={() => (hoveredElement = null)}
        >
          <Clock size={20} />
          {#if hoveredElement === "about"}
            <div
              class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
            >
              About
            </div>
          {/if}
        </button>
      </div>
    </div>
  </header>

  {#if showLeftNav}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      on:click={closeLeftNav}
    ></div>
    <nav
      class="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out"
      class:translate-x-0={showLeftNav}
      class:-translate-x-full={!showLeftNav}
    >
      <div class="p-4 space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Menu</h2>
          <button
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:click={closeLeftNav}
          >
            <X size={24} />
          </button>
        </div>
        <button
          class="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={() => {
            toggleTimeFormat();
            closeLeftNav();
          }}
        >
          <Clock size={20} />
          <span
            >{use24HourFormat
              ? "Switch to 12-hour format"
              : "Switch to 24-hour format"}</span
          >
        </button>
        <button
          class="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={() => {
            toggleDarkMode();
            closeLeftNav();
          }}
        >
          {#if darkMode}
            <Sun size={20} />
            <span>Switch to light mode</span>
          {:else}
            <Moon size={20} />
            <span>Switch to dark mode</span>
          {/if}
        </button>
        <button
          class="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={toggleFeedbackModal}
        >
          <MessageSquare size={20} />
          <span>Provide Feedback</span>
        </button>
      </div>
    </nav>
  {/if}

  <div
    class="flex-1 w-full max-w-4xl mx-auto p-4 overflow-hidden flex flex-col"
  >
    {#if showSearch}
      <div class="mb-4 relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search todos..."
          class="w-full p-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
        />
        <button
          class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          on:click={closeSearch}
        >
          <X size={20} />
        </button>
      </div>
    {/if}

    {#if showFilters}
      <div class="mb-4 flex items-center space-x-4">
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            bind:checked={showCompleted}
            class="form-checkbox h-4 w-4 text-blue-600"
          />
          <span>Show completed</span>
        </label>
        <select
          bind:value={sortBy}
          class="p-2 border rounded bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value="default">Default sort</option>
          <option value="creationDate">Sort by creation date</option>
          <option value="alphabetical">Sort alphabetically</option>
          {#if hasDueDates}
            <option value="dueDate">Sort by due date</option>
          {/if}
        </select>
      </div>
      {#if !hasDueDates && sortBy === "creationDate"}
        <div class="mb-4 text-sm text-yellow-600 dark:text-yellow-400">
          Note: No lists have due dates set. Sorting by creation date instead.
        </div>
      {/if}
    {/if}

    <div class="space-y-4 sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 pb-4">
      <div class="flex space-x-2">
        <input
          class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
          placeholder="New list name"
          bind:value={newListLabel}
          on:keydown={handleNewListKeydown}
        />
        <button
          type="button"
          class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={createNewList}
          disabled={!newListLabel.trim()}
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
    </div>

    <div class="space-y-2 overflow-y-auto flex-1">
      <section
        use:dndzone={{ items: filteredLists, flipDurationMs: 300 }}
        on:consider={handleListDndConsider}
        on:finalize={handleListDndFinalize}
      >
        {#each filteredLists as list, index (list.id)}
          <div animate:flip={{ duration: 300 }}>
            <div
              class="border dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2 bg-white dark:bg-gray-800 {list.expanded
                ? 'pb-2'
                : ''}"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between p-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 {getListHeaderBackgroundColor(
                  index
                )}"
                on:click={() => toggleListExpansion(list.id)}
                on:keydown={(e) => handleListKeydown(e, list.id)}
              >
                <div class="flex items-center space-x-2 flex-grow">
                  <GripVertical
                    size={16}
                    class="text-gray-400 dark:text-gray-500 cursor-move"
                  />
                  {#if editingListId === list.id}
                    <input
                      type="text"
                      bind:value={editingListLabel}
                      on:blur={saveEditingListName}
                      on:keydown={(e) => {
                        if (e.key === "Enter") saveEditingListName();
                      }}
                      on:click={handleEditInputClick}
                      class="flex-grow p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                    />
                  {:else}
                    <span class="font-semibold flex-grow">{list.label}</span>
                  {/if}
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    class="p-1 {list.note
                      ? 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} focus:outline-none"
                    on:click|stopPropagation={() => startEditingNote(list.id)}
                    on:mouseenter={() => (hoveredElement = `note-${list.id}`)}
                    on:mouseleave={() => (hoveredElement = null)}
                  >
                    <MessageSquare size={16} />
                    {#if hoveredElement === `note-${list.id}`}
                      <div
                        class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                      >
                        {list.note ? "Edit note" : "Add note"}
                      </div>
                    {/if}
                  </button>
                  <button
                    type="button"
                    class="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                    on:click|stopPropagation={() => copyList(list.id)}
                    on:mouseenter={() => (hoveredElement = `copy-${list.id}`)}
                    on:mouseleave={() => (hoveredElement = null)}
                  >
                    <Copy size={16} />
                    {#if hoveredElement === `copy-${list.id}`}
                      <div
                        class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                      >
                        Copy list
                      </div>
                    {/if}
                  </button>
                  <button
                    type="button"
                    class="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                    on:click|stopPropagation={() =>
                      startEditingListName(list.id)}
                    on:mouseenter={() => (hoveredElement = `edit-${list.id}`)}
                    on:mouseleave={() => (hoveredElement = null)}
                  >
                    <Edit size={16} />
                    {#if hoveredElement === `edit-${list.id}`}
                      <div
                        class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                      >
                        Edit list name
                      </div>
                    {/if}
                  </button>
                  <button
                    type="button"
                    class="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 focus:outline-none"
                    on:click|stopPropagation={() => deleteList(list.id)}
                    on:mouseenter={() => (hoveredElement = `delete-${list.id}`)}
                    on:mouseleave={() => (hoveredElement = null)}
                  >
                    <Trash2 size={16} />
                    {#if hoveredElement === `delete-${list.id}`}
                      <div
                        class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                      >
                        Delete list
                      </div>
                    {/if}
                  </button>
                  <ChevronRight
                    size={20}
                    class="transform transition-transform duration-200 {list.expanded
                      ? 'rotate-90'
                      : ''}"
                  />
                </div>
              </button>
              {#if list.expanded}
                <div transition:slide|local={{ duration: 300 }}>
                  {#if list.note}
                    <div
                      class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm italic"
                    >
                      {list.note}
                    </div>
                  {/if}
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
                              class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 mb-2"
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
                                  : 'text-gray-800 dark:text-gray-200'}"
                              >
                                {@html todo.text}
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
                                  on:mouseenter={() =>
                                    (hoveredElement = `date-${todo.id}`)}
                                  on:mouseleave={() => (hoveredElement = null)}
                                >
                                  <span class="sr-only"
                                    >{todo.dueDate
                                      ? "Edit due date and time"
                                      : "Set due date and time"}</span
                                  >
                                  {#if todo.dueDate && !todo.completed}
                                    <span class="text-sm whitespace-nowrap">
                                      {formatDate(todo.dueDate)}
                                    </span>
                                    <Calendar size={16} />
                                  {:else}
                                    <Clock size={16} />
                                  {/if}
                                  {#if hoveredElement === `date-${todo.id}`}
                                    <div
                                      class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                                    >
                                      {todo.dueDate
                                        ? "Edit due date"
                                        : "Set due date"}
                                    </div>
                                  {/if}
                                </button>
                                <button
                                  type="button"
                                  class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  on:click={() => copyTodoText(todo.text)}
                                  on:mouseenter={() =>
                                    (hoveredElement = `copy-todo-${todo.id}`)}
                                  on:mouseleave={() => (hoveredElement = null)}
                                >
                                  <Copy size={16} />
                                  {#if hoveredElement === `copy-todo-${todo.id}`}
                                    <div
                                      class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                                    >
                                      Copy todo text
                                    </div>
                                  {/if}
                                </button>
                                <button
                                  type="button"
                                  class="p-1 {todo.note
                                    ? 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'} focus:outline-none"
                                  on:click|stopPropagation={() =>
                                    toggleTodoNote(list.id, todo.id)}
                                  on:mouseenter={() =>
                                    (hoveredElement = `note-todo-${todo.id}`)}
                                  on:mouseleave={() => (hoveredElement = null)}
                                >
                                  <MessageSquare size={16} />
                                  {#if hoveredElement === `note-todo-${todo.id}`}
                                    <div
                                      class="absolute mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded"
                                    >
                                      {todo.note ? "Edit note" : "Add note"}
                                    </div>
                                  {/if}
                                </button>
                              </div>
                            </div>
                            {#if todo.showDateInput}
                              <div class="mt-2 ml-8 space-y-2">
                                <div class="flex items-center space-x-2">
                                  <input
                                    type="datetime-local"
                                    value={todo.dueDate
                                      ? getLocalISOString(
                                          new Date(todo.dueDate)
                                        )
                                      : getLocalISOString(new Date())}
                                    on:change={(e) =>
                                      handleDateChange(e, todo, list.id)}
                                    class="w-full p-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                  />
                                </div>
                              </div>
                            {/if}
                            {#if todo.showNote}
                              <div class="mt-2 ml-8 space-y-2">
                                <textarea
                                  value={todo.note || ""}
                                  on:input={(e) =>
                                    updateTodoNote(
                                      list.id,
                                      todo.id,
                                      e.target.value
                                    )}
                                  placeholder="Add a note..."
                                  class="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                  rows="2"
                                ></textarea>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </section>
                    </div>
                    <div class="mt-4">
                      <input
                        class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        placeholder="New todo item"
                        bind:value={newTodoText}
                        on:keydown={(e) =>
                          handleNewTodoKeydownEvent(e, list.id)}
                      />
                      <button
                        type="button"
                        class="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
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
</main>

{#if editingNoteId}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
    >
      <h2 class="text-2xl font-bold mb-4">Edit List Note</h2>
      <textarea
        bind:value={editingNote}
        placeholder="Enter a note for this list..."
        class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white mb-4"
        rows="4"
      ></textarea>
      <div class="flex justify-end space-x-2">
        <button
          class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          on:click={() => (editingNoteId = null)}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          on:click={saveEditingNote}
        >
          Save Note
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showAbout}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
    >
      <h2 class="text-2xl font-bold mb-4">About Just A List</h2>
      <p class="mb-4">
        Just A List is a simple, yet powerful todo list application. It allows
        you to create multiple lists, add tasks, set due dates, and more.
      </p>
      <p class="mb-4">
        This app is designed to help you stay organized and productive. We hope
        you find it useful!
      </p>
      <div class="flex justify-end">
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          on:click={() => (showAbout = false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showShareModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
    >
      <h2 class="text-2xl font-bold mb-4">Share Your List</h2>
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2" for="expiration">
          Expiration
        </label>
        <select
          id="expiration"
          bind:value={shareOptions.expirationTime}
          class="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value={null}>No expiration</option>
          <option value={Date.now() + 3600000}>1 hour</option>
          <option value={Date.now() + 86400000}>24 hours</option>
          <option value={Date.now() + 604800000}>1 week</option>
        </select>
      </div>
      <div class="mb-4">
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            bind:checked={shareOptions.isEditable}
            class="form-checkbox h-4 w-4 text-blue-600"
          />
          <span>Allow editing</span>
        </label>
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2" for="shareLink">
          Shareable Link
        </label>
        <div class="flex">
          <input
            type="text"
            id="shareLink"
            readonly
            value={shortShareUrl}
            class="flex-grow p-2 border rounded-l bg-gray-100 dark:bg-gray-700 dark:text-white"
          />
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
            on:click={copyShareableLink}
          >
            Copy
          </button>
        </div>
      </div>
      {#if qrCodeDataUrl}
        <div class="mb-4">
          <h3 class="text-lg font-semibold mb-2">QR Code</h3>
          <img
            src={qrCodeDataUrl}
            alt="QR Code for shared list"
            class="mx-auto"
          />
        </div>
      {/if}
      <div class="flex justify-between">
        <button
          class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          on:click={() => (showShareModal = false)}
        >
          Close
        </button>
        <button
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
          on:click={() => (showShareFeedback = true)}
        >
          Share Feedback
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showShareFeedback}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
    >
      <h2 class="text-2xl font-bold mb-4">Share Your Feedback</h2>
      <textarea
        bind:value={shareFeedback}
        placeholder="How was your experience with sharing? Any suggestions for improvement?"
        class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white mb-4"
        rows="4"
      ></textarea>
      <div class="flex justify-end space-x-2">
        <button
          class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          on:click={() => (showShareFeedback = false)}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          on:click={submitShareFeedback}
        >
          Submit Feedback
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showFeedbackModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
    >
      <h2 class="text-2xl font-bold mb-4">Provide Feedback</h2>
      <textarea
        placeholder="Share your thoughts, suggestions, or report any issues..."
        class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white mb-4"
        rows="4"
      ></textarea>
      <div class="flex justify-end space-x-2">
        <button
          class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          on:click={() => (showFeedbackModal = false)}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(html) {
    overflow-y: hidden;
  }

  :global(body) {
    overflow-y: auto;
  }

  :global(.dark) {
    color-scheme: dark;
  }
</style>
