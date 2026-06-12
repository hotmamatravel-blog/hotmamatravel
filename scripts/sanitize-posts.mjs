import fs from 'fs';
import path from 'path';

const blogDir = './src/content/blog';
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

let totalModified = 0;

for (const file of files) {
  const filePath = path.join(blogDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = sanitizeContent(content);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    console.log(`✨ Sanitized layout blocks & styles: ${file}`);
  }
}

console.log(`\n🎉 Sanitization complete. Modified ${totalModified} files.`);

function convertIconListToFlat(block) {
  const items = [];
  let pos = 0;
  
  while (pos < block.length) {
    const svgStart = block.indexOf('<svg', pos);
    if (svgStart === -1) break;
    const svgEnd = block.indexOf('</svg>', svgStart);
    if (svgEnd === -1) break;
    
    const svgText = block.substring(svgStart, svgEnd + 6);
    
    let nextSvgStart = block.indexOf('<svg', svgEnd + 6);
    if (nextSvgStart === -1) {
      nextSvgStart = block.length;
    }
    
    const segment = block.substring(svgEnd + 6, nextSvgStart);
    const label = extractLabel(segment);
    
    if (label) {
      items.push({ svg: svgText, label: label });
    }
    pos = nextSvgStart;
  }
  
  if (items.length > 0) {
    let flatList = '<ul class="wp-block-uagb-icon-list uagb-icon-list__wrap">';
    for (const item of items) {
      flatList += `<li class="wp-block-uagb-icon-list-child">${item.svg}<div class="uagb-icon-list__label-wrap">${item.label}</div></li>`;
    }
    flatList += '</ul>';
    return flatList;
  }
  
  return block;
}

function extractLabel(segment) {
  // Remove Gutenberg structural divs
  let label = segment.replace(/<div\s+class="(?:wp-block-uagb|uagb)[^"]*"[^>]*>/gi, '');
  // Remove any remaining divs and closing divs
  label = label.replace(/<div[^>]*>/gi, '');
  label = label.replace(/<\/div>/gi, '');
  return label.trim();
}

function cleanInfobox(block) {
  // Convert markdown inside the block to simple HTML to ensure we don't need double-newlines
  let cleaned = block.replace(/####\s*([^\r\n]+)/g, '<h4>$1</h4>');
  cleaned = cleaned.replace(/###\s*([^\r\n]+)/g, '<h3>$1</h3>');
  cleaned = cleaned.replace(/##\s*([^\r\n]+)/g, '<h2>$1</h2>');
  
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Replace double newlines with <br><br> and single newlines with space
  cleaned = cleaned.replace(/\r?\n\r?\n/g, '<br><br>');
  cleaned = cleaned.replace(/\r?\n/g, ' ');
  
  // Count open vs closed divs in the cleaned text
  const openMatches = cleaned.match(/<div[>\s]/gi) || [];
  const closeMatches = cleaned.match(/<\/div>/gi) || [];
  
  const diff = openMatches.length - closeMatches.length;
  if (diff > 0) {
    cleaned = cleaned.trim() + '</div>'.repeat(diff);
  }
  
  return cleaned;
}

function sanitizeContent(content) {
  // 1. Remove all inline <style>...</style> blocks (case-insensitive)
  let cleanContent = content.replace(/<style[\s\S]*?<\/style>/gi, '');

  const lines = cleanContent.split(/\r?\n/);
  const resultLines = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect start of icon list parent wrapper
    if (trimmed.startsWith('<div class="') && trimmed.includes('wp-block-uagb-icon-list') && !trimmed.includes('wp-block-uagb-icon-list-child')) {
      let listBlock = line;
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        
        if (nextTrimmed.startsWith('<div class="') && nextTrimmed.includes('wp-block-uagb-icon-list') && !nextTrimmed.includes('wp-block-uagb-icon-list-child')) {
          break;
        }
        if (nextTrimmed.startsWith('#')) {
          break;
        }
        if (nextTrimmed.startsWith('<figure') || nextTrimmed.startsWith('<img') || nextTrimmed.includes('<figure')) {
          break;
        }
        if (nextTrimmed.includes('uagb-infobox__outer-wrap') || nextTrimmed.includes('wp-block-uagb-info-box')) {
          break;
        }
        if (nextTrimmed && !nextTrimmed.includes('<div') && !nextTrimmed.includes('</div') && !nextTrimmed.includes('<svg') && !nextTrimmed.includes('</svg>')) {
          break;
        }
        
        listBlock += '\n' + nextLine;
        i++;
      }
      
      resultLines.push(convertIconListToFlat(listBlock));
      continue;
    }
    
    // Detect start of infobox
    if (trimmed.startsWith('<div class="') && (trimmed.includes('uagb-infobox__outer-wrap') || trimmed.includes('wp-block-uagb-info-box'))) {
      let infoboxBlock = line;
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        
        infoboxBlock += '\n' + nextLine;
        i++;
        
        if (nextTrimmed.includes('See map of') && nextTrimmed.includes('</a></div>')) {
          break;
        }
        if (nextTrimmed.endsWith('</a></div>') || nextTrimmed.includes('<\/a>\s*<\/div>')) {
          break;
        }
      }
      
      resultLines.push(cleanInfobox(infoboxBlock));
      continue;
    }
    
    resultLines.push(line);
    i++;
  }
  
  return resultLines.join('\n');
}
