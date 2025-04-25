<script>
  export let project;
</script>

<div class="p-2 text-left bg-white rounded border shadow-sm cursor-move" data-id={project.id}>
  <a href={project.url} target="_blank" class="hover:underline text-blue-600">
    {project.title}
  </a>
  <div class="mt-0.5 text-xs text-gray-400">{project.id}</div>
</div>
