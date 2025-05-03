<script>
  export let text;
  export let top = 0;
  export let left = 0;
  export let align = 'center';  // 'left', 'center', 'right'
</script>

<div
  class="fixed z-50 px-2 py-1.5 text-xs rounded-md bg-githubTooltipBgColor text-githubTooltipTextColor whitespace-nowrap"
  style="top: {top}px; left: {left}px; transform: translateX({align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0%'});"
>
  {text}
</div>
