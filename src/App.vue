<template>
  <el-container class="container">
    <el-header>
      <h1>周报生成器</h1>
    </el-header>
    
    <el-main>
      <el-card class="projects-config">
        <template #header>
          <h2>项目配置</h2>
        </template>
        <div v-for="(project, index) in projects" :key="project.path" class="project-item">
          <el-checkbox v-model="project.enabled" />
          <el-input v-model="project.path" placeholder="项目路径" />
          <el-input v-model="project.name" placeholder="项目名称" />
          <el-button type="danger" @click="removeProject(index)" circle>
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <el-button type="primary" @click="addProject">添加项目</el-button>
      </el-card>

      <el-card class="date-range">
        <template #header>
          <h2>时间范围</h2>
        </template>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-card>

      <el-card class="preview">
        <template #header>
          <h2>预览</h2>
        </template>
        <div class="markdown-preview" v-html="previewContent"></div>
      </el-card>
    </el-main>

    <el-footer>
      <el-button type="primary" @click="generateReport">生成周报</el-button>
      <el-button @click="saveConfig">保存配置</el-button>
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import type { Project, WeeklyReport } from './types'
import { marked } from 'marked'

const projects = ref<Project[]>([
  {
    path: '../sso-login',
    name: '智联v1.1.0',
    enabled: true
  },
  {
    path: '../acs',
    name: '智联v1.1.0',
    enabled: true
  }
])

const dateRange = ref<[Date, Date]>([new Date(), new Date()])

const addProject = () => {
  projects.value.push({
    path: '',
    name: '',
    enabled: true
  })
}

const removeProject = (index: number) => {
  projects.value.splice(index, 1)
}

const previewContent = computed(() => {
  const report = generateReportContent()
  return marked(report)
})

const generateReportContent = () => {
  return `### 本周工作总结\n\n${projects.value.map(p => 
    `#### ${p.name}\n\n1. 待获取提交记录\n`).join('\n')
  }\n### 下周工作计划\n\n#### 智联\n\n1. 继续优化功能\n2. 处理测试反馈问题\n`
}

const generateReport = async () => {
  try {
    const response = await window.electronAPI.generateReport({
      projects: projects.value,
      dateRange: dateRange.value
    })
    console.log('Report generated:', response)
  } catch (error) {
    console.error('Failed to generate report:', error)
  }
}

const saveConfig = () => {
  localStorage.setItem('projects', JSON.stringify(projects.value))
}
</script>

<style scoped>
.container {
  height: 100vh;
}

.project-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.markdown-preview {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style> 