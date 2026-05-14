<script setup lang="ts">
import { computed } from 'vue';
import { Sparkles, Check, Zap, Star } from 'lucide-vue-next';

interface TitleProps {
  name: string;
  rarity?: 'common' | 'rare' | 'secret';
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  isLocked?: boolean;
  italic?: boolean;
}

const props = withDefaults(defineProps<TitleProps>(), {
  rarity: 'common',
  size: 'md',
  isLocked: false,
  italic: true
});

const containerClasses = computed(() => {
  const classes = ['inline-flex items-center gap-1.5 font-kanit font-black leading-none'];
  
  // Size mapping
  if (props.size === 'sm') classes.push('text-[11px] px-1.5 py-0.5 rounded-md');
  else if (props.size === 'md') classes.push('text-[13px] px-2.5 py-1 rounded-lg');
  else classes.push('text-[16px] px-3 py-1.5 rounded-xl');

  if (props.rarity === 'secret') {
    classes.push('bg-slate-900 border border-slate-700 shadow-sm');
  } else if (props.rarity === 'rare') {
    classes.push('bg-white/10 backdrop-blur-sm border border-amber-200/50 shadow-sm');
  } else {
    classes.push('bg-slate-50 border border-slate-200');
  }

  if (props.isLocked) classes.push('opacity-60 grayscale');

  return classes.join(' ');
});

const textClasses = computed(() => {
  const classes = [];
  if (props.rarity === 'secret') classes.push('text-rgb-cycle italic tracking-widest');
  else if (props.rarity === 'rare') classes.push('text-shine tracking-wide');
  else classes.push('tracking-wide');

  if (props.italic && props.rarity !== 'secret') classes.push('italic');
  
  return classes.join(' ');
});

const textStyle = computed(() => {
  if (props.rarity === 'secret') return {};
  return { 
    color: props.color || (props.rarity === 'rare' ? '#f59e0b' : '#475569'),
    '--title-color': props.color || (props.rarity === 'rare' ? '#f59e0b' : '#475569')
  };
});

const iconSize = computed(() => {
  if (props.size === 'sm') return 10;
  if (props.size === 'md') return 12;
  return 14;
});
</script>

<template>
  <div :class="containerClasses">
    <div class="flex-shrink-0 flex items-center justify-center">
      <Star v-if="rarity === 'secret'" :size="iconSize" class="text-purple-400 animate-pulse" />
      <Sparkles v-else-if="rarity === 'rare'" :size="iconSize" class="text-amber-400" />
      <Zap v-else :size="iconSize" class="text-slate-400" />
    </div>
    <span 
      :class="textClasses" 
      :style="textStyle"
      :data-text="name"
    >
      {{ name }}
    </span>
  </div>
</template>

<style scoped>
.text-rgb-cycle {
  background: linear-gradient(to right, #ff2a2a, #ff7a00, #ffc700, #10b981, #0094ff, #8b5cf6, #ff2a2a);
  background-size: 200% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: rgb-rainbow 3s linear infinite;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
}

@keyframes rgb-rainbow {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}

.text-shine {
  position: relative;
  display: inline-block;
}

.text-shine::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  color: transparent;
  background-image: linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.7) 50%, transparent 75%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  animation: shine-text 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  pointer-events: none;
}

@keyframes shine-text {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
</style>
