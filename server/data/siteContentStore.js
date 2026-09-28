import defaultSiteContent from '../../client/siteContent.js'

let memorySiteContent = structuredClone(defaultSiteContent)

export function getMemorySiteContent() {
  return memorySiteContent
}

export function setMemorySiteContent(content) {
  memorySiteContent = content
}