<script>
  import { onMount } from "svelte";

  let sidebarPosition = "right";

  onMount(() => {
    chrome.runtime.sendMessage({ action: "sidePanelReady" });
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "updateSidebarPosition") {
        sidebarPosition = request.position;
      }
    });
  });
</script>

<main>
  <h1>Todo List Sidebar</h1>

  <div class="input-group">
    <input type="text" placeholder="Add a new todo" />
    <select>
      <option value="">No Label</option>
      <option value="work">Work</option>
      <option value="personal">Personal</option>
    </select>
    <button>Add</button>
  </div>

  <div class="input-group">
    <input type="text" placeholder="New label" />
    <button>Add Label</button>
  </div>

  <div class="task-list">
    <div class="task">
      <input type="checkbox" />
      <span>Sample task</span>
      <span class="label">Work</span>
      <button class="delete-btn">×</button>
    </div>
  </div>

  <div class="input-group">
    <textarea placeholder="Enter tasks (one per line)"></textarea>
    <button>Create Tasks</button>
  </div>
</main>

<style>
  main {
    font-family: Arial, sans-serif;
    padding: 20px;
    max-width: 300px;
    margin: 0 auto;
    border-left: 2px solid #ccc;
  }

  h1 {
    text-align: center;
    color: #333;
  }

  .input-group {
    margin-bottom: 15px;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 8px;
    margin-bottom: 10px;
  }

  button {
    width: 100%;
    padding: 10px;
    background-color: #4caf50;
    color: white;
    border: none;
    cursor: pointer;
  }

  .task-list {
    margin-bottom: 15px;
  }

  .task {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .label {
    background-color: #ddd;
    padding: 2px 5px;
    border-radius: 3px;
    margin-left: 5px;
    font-size: 0.8em;
  }

  .delete-btn {
    margin-left: auto;
    background-color: #f44336;
    color: white;
    border: none;
    padding: 5px 10px;
    cursor: pointer;
  }
</style>
