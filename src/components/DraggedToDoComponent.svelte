<script lang="ts">
  export let todo: {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
  };
</script>

<div class="flex items-center space-x-2 p-2 bg-white rounded shadow-lg">
  <input
    type="checkbox"
    checked={todo.completed}
    class="form-checkbox h-5 w-5 text-blue-600"
  />
  <span class={todo.completed ? "line-through text-gray-500" : "text-gray-800"}>
    {todo.text}
  </span>
</div>
