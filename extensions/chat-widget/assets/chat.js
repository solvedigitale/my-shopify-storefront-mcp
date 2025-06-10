/**
 * Shop AI Chat - Türkçe Dil Desteğiyle Geliştirilmiş Versiyon
*/

// REMOVED: Force API endpoint override that was causing the issue
// This was overriding the config from Liquid template

(function() {
  'use strict';

  // Debug mode
  const DEBUG = true;
  
  if (DEBUG) {
    console.log('Chat Widget Loading...');
    console.log('Script URL:', document.currentScript?.src);
    console.log('Initial Config:', window.shopChatConfig);
  }

  // Türkçe dil metinleri
  const TEXTS = {
    tr: {
      loadingHistory: "Geçmiş konuşmalar yükleniyor...",
      welcome: "👋 Merhaba! Size nasıl yardımcı olabilirim?",
      errorGeneral: "Üzgünüm, isteğinizi şu anda işleyemedim. Lütfen daha sonra tekrar deneyin.",
      errorBusy: "Üzgünüm, sunucularımız şu anda meşgul. Lütfen daha sonra tekrar deneyin.",
      authInProgress: "Kimlik doğrulama devam ediyor. Lütfen açılan pencerede işlemi tamamlayın.",
      authSuccess: "Kimlik doğrulama başarılı! İsteğinizle devam ediyorum.",
      authPopupBlocked: "Shopify ile kimlik doğrulaması için pop-up'lara izin verin.",
      noProductsFound: "Ürün bulunamadı",
      topProducts: "En Uygun Ürünler",
      addToCart: "Sepete Ekle",
      proceedToCheckout: "ödeme için buraya tıklayın",
      noHistoryFetch: "Konuşma geçmişi yüklenemedi",
      typing: "yazıyor..."
    },
    en: {
      loadingHistory: "Loading conversation history...",
      welcome: "👋 Hi there! How can I help you today?",
      errorGeneral: "Sorry, I couldn't process your request at the moment. Please try again later.",
      errorBusy: "Sorry, our servers are currently busy. Please try again later.",
      authInProgress: "Authentication in progress. Please complete the process in the popup window.",
      authSuccess: "Authorization successful! I'm now continuing with your request.",
      authPopupBlocked: "Please allow popups for this site to authenticate with Shopify.",
      noProductsFound: "No products found",
      topProducts: "Top Matching Products",
      addToCart: "Add to Cart",
      proceedToCheckout: "click here to proceed to checkout",
      noHistoryFetch: "Failed to fetch chat history",
      typing: "typing..."
    }
  };

  // Varsayılan dil (Türkçe)
  let currentLang = 'tr';
  
  // Tarayıcı dilini kontrol et
  if (navigator.language.startsWith('en')) {
    currentLang = 'en';
  }

  // getText fonksiyonu
  function getText(key) {
    return TEXTS[currentLang][key] || TEXTS.en[key] || key;
  }

  // Helper function to get API endpoint
  const getApiEndpoint = () => {
    // Priority order: shopChatConfig > meta tag > default
    const endpoint = window.shopChatConfig?.apiEndpoint ||
           document.querySelector('meta[name="chat-api-endpoint"]')?.content ||
           'https://my-shopify-storefront-mcp.onrender.com';
    
    if (DEBUG) {
      console.log('Using API endpoint:', endpoint);
    }
    
    return endpoint;
  };

  const ShopAIChat = {
    UI: {
      elements: {},
      isMobile: false,

      init: function(container) {
        if (!container) return;

        this.elements = {
          container: container,
          chatBubble: container.querySelector('.shop-ai-chat-bubble'),
          chatWindow: container.querySelector('.shop-ai-chat-window'),
          closeButton: container.querySelector('.shop-ai-chat-close'),
          chatInput: container.querySelector('.shop-ai-chat-input input'),
          sendButton: container.querySelector('.shop-ai-chat-send'),
          messagesContainer: container.querySelector('.shop-ai-chat-messages')
        };

        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.setupEventListeners();
        this.setupPlaceholder();

        if (this.isMobile) {
          this.setupMobileViewport();
        }
      },

      setupPlaceholder: function() {
        // Input placeholder'ını dile göre ayarla
        const placeholder = currentLang === 'tr' ? 'Mesajınızı yazın...' : 'Type your message...';
        this.elements.chatInput.placeholder = placeholder;
      },

      setupEventListeners: function() {
        const { chatBubble, closeButton, chatInput, sendButton, messagesContainer } = this.elements;

        chatBubble.addEventListener('click', () => this.toggleChatWindow());
        closeButton.addEventListener('click', () => this.closeChatWindow());

        // Enter tuşu ile mesaj gönder
        chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            ShopAIChat.Message.send(chatInput, messagesContainer);
            this.handleMobileKeyboard(chatInput);
          }
        });

        // Gönder butonu
        sendButton.addEventListener('click', () => {
          if (chatInput.value.trim() !== '') {
            ShopAIChat.Message.send(chatInput, messagesContainer);
            this.handleMobileKeyboard(chatInput);
          }
        });

        window.addEventListener('resize', () => this.scrollToBottom());

        // Auth linkler için global handler
        document.addEventListener('click', function(event) {
          if (event.target && event.target.classList.contains('shop-auth-trigger')) {
            event.preventDefault();
            if (window.shopAuthUrl) {
              ShopAIChat.Auth.openAuthPopup(window.shopAuthUrl);
            }
          }
        });
      },

      handleMobileKeyboard: function(input) {
        if (this.isMobile) {
          input.blur();
          setTimeout(() => input.focus(), 300);
        }
      },

      setupMobileViewport: function() {
        const setViewportHeight = () => {
          document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
        };
        window.addEventListener('resize', setViewportHeight);
        setViewportHeight();
      },

      toggleChatWindow: function() {
        const { chatWindow, chatInput } = this.elements;
        const isActive = chatWindow.classList.contains('active');

        if (!isActive) {
          chatWindow.classList.add('active');
          if (this.isMobile) {
            document.body.classList.add('shop-ai-chat-open');
            setTimeout(() => chatInput.focus(), 500);
          } else {
            chatInput.focus();
          }
          this.scrollToBottom();
        } else {
          this.closeChatWindow();
        }
      },

      closeChatWindow: function() {
        const { chatWindow, chatInput } = this.elements;
        
        chatWindow.classList.remove('active');
        
        if (this.isMobile) {
          chatInput.blur();
          document.body.classList.remove('shop-ai-chat-open');
        }
      },

      scrollToBottom: function() {
        const { messagesContainer } = this.elements;
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      },

      showTypingIndicator: function() {
        const { messagesContainer } = this.elements;

        // Mevcut typing indicator'ı kaldır
        this.removeTypingIndicator();

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('shop-ai-typing-indicator');
        typingIndicator.innerHTML = `
          <span></span><span></span><span></span>
          <span style="margin-left: 8px; color: #64748b; font-size: 13px;">${getText('typing')}</span>
        `;
        messagesContainer.appendChild(typingIndicator);
        this.scrollToBottom();
      },

      removeTypingIndicator: function() {
        const { messagesContainer } = this.elements;
        const typingIndicator = messagesContainer.querySelector('.shop-ai-typing-indicator');
        if (typingIndicator) {
          typingIndicator.remove();
        }
      },

      displayProductResults: function(products) {
        const { messagesContainer } = this.elements;

        const productSection = document.createElement('div');
        productSection.classList.add('shop-ai-product-section');
        messagesContainer.appendChild(productSection);

        const header = document.createElement('div');
        header.classList.add('shop-ai-product-header');
        header.innerHTML = `<h4>${getText('topProducts')}</h4>`;
        productSection.appendChild(header);

        const productsContainer = document.createElement('div');
        productsContainer.classList.add('shop-ai-product-grid');
        productSection.appendChild(productsContainer);

        if (!products || !Array.isArray(products) || products.length === 0) {
          const noProductsMessage = document.createElement('p');
          noProductsMessage.textContent = getText('noProductsFound');
          noProductsMessage.style.padding = "10px";
          productsContainer.appendChild(noProductsMessage);
        } else {
          products.forEach(product => {
            const productCard = ShopAIChat.Product.createCard(product);
            productsContainer.appendChild(productCard);
          });
        }

        this.scrollToBottom();
      },

      showNotification: function(message, type = 'info') {
        // Bildirim sistemi ekle
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${type === 'error' ? '#ef4444' : '#22c55e'};
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.style.animation = 'slideOutRight 0.3s ease';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
    },

    Message: {
      send: async function(chatInput, messagesContainer) {
        const userMessage = chatInput.value.trim();
        const conversationId = sessionStorage.getItem('shopAiConversationId');

        this.add(userMessage, 'user', messagesContainer);
        chatInput.value = '';
        
        ShopAIChat.UI.showTypingIndicator();

        try {
          ShopAIChat.API.streamResponse(userMessage, conversationId, messagesContainer);
        } catch (error) {
          console.error('API Error:', error);
          ShopAIChat.UI.removeTypingIndicator();
          this.add(getText('errorGeneral'), 'assistant', messagesContainer);
          ShopAIChat.UI.showNotification(getText('errorGeneral'), 'error');
        }
      },

      add: function(text, sender, messagesContainer) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('shop-ai-message', sender);

        // Timestamp ekle
        const timestamp = new Date().toLocaleTimeString(currentLang === 'tr' ? 'tr-TR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        if (sender === 'assistant') {
          messageElement.dataset.rawText = text;
          messageElement.dataset.timestamp = timestamp;
          ShopAIChat.Formatting.formatMessageContent(messageElement);
        } else {
          messageElement.textContent = text;
          messageElement.dataset.timestamp = timestamp;
        }

        // Hover'da timestamp göster
        messageElement.title = timestamp;

        messagesContainer.appendChild(messageElement);
        ShopAIChat.UI.scrollToBottom();

        return messageElement;
      },

      addToolUse: function(toolMessage, messagesContainer) {
        const match = toolMessage.match(/Calling tool: (\w+) with arguments: (.+)/);
        if (!match) {
          const toolUseElement = document.createElement('div');
          toolUseElement.classList.add('shop-ai-message', 'tool-use');
          toolUseElement.textContent = toolMessage;
          messagesContainer.appendChild(toolUseElement);
          ShopAIChat.UI.scrollToBottom();
          return;
        }

        const toolName = match[1];
        const argsString = match[2];

        const toolUseElement = document.createElement('div');
        toolUseElement.classList.add('shop-ai-message', 'tool-use');

        const headerElement = document.createElement('div');
        headerElement.classList.add('shop-ai-tool-header');

        const toolText = document.createElement('span');
        toolText.classList.add('shop-ai-tool-text');
        toolText.textContent = `${currentLang === 'tr' ? 'Araç çağrısı' : 'Calling tool'}: ${toolName}`;

        const toggleElement = document.createElement('span');
        toggleElement.classList.add('shop-ai-tool-toggle');
        toggleElement.textContent = '[+]';

        headerElement.appendChild(toolText);
        headerElement.appendChild(toggleElement);

        const argsElement = document.createElement('div');
        argsElement.classList.add('shop-ai-tool-args');

        try {
          const parsedArgs = JSON.parse(argsString);
          argsElement.textContent = JSON.stringify(parsedArgs, null, 2);
        } catch (e) {
          argsElement.textContent = argsString;
        }

        headerElement.addEventListener('click', function() {
          const isExpanded = argsElement.classList.contains('expanded');
          argsElement.classList.toggle('expanded');
          toggleElement.textContent = isExpanded ? '[+]' : '[-]';
        });

        toolUseElement.appendChild(headerElement);
        toolUseElement.appendChild(argsElement);
        messagesContainer.appendChild(toolUseElement);
        ShopAIChat.UI.scrollToBottom();
      }
    },

    Formatting: {
      formatMessageContent: function(element) {
        if (!element || !element.dataset.rawText) return;

        const rawText = element.dataset.rawText;
        let processedText = rawText;

        // Markdown link'leri işle
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        processedText = processedText.replace(markdownLinkRegex, (match, text, url) => {
          if (url.includes('shopify.com/authentication') &&
             (url.includes('oauth/authorize') || url.includes('authentication'))) {
            window.shopAuthUrl = url;
            return `<a href="#auth" class="shop-auth-trigger">${text}</a>`;
          }
          else if (url.includes('/cart') || url.includes('checkout')) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${getText('proceedToCheckout')}</a>`;
          } else {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          }
        });

        processedText = this.convertMarkdownToHtml(processedText);
        element.innerHTML = processedText;
      },

      convertMarkdownToHtml: function(text) {
        // Bold text
        text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
        
        const lines = text.split('\n');
        let currentList = null;
        let listItems = [];
        let htmlContent = '';
        let startNumber = 1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const unorderedMatch = line.match(/^\s*([-*])\s+(.*)/);
          const orderedMatch = line.match(/^\s*(\d+)[\.)]\s+(.*)/);

          if (unorderedMatch) {
            if (currentList !== 'ul') {
              if (currentList === 'ol') {
                htmlContent += `<ol start="${startNumber}">` + listItems.join('') + '</ol>';
                listItems = [];
              }
              currentList = 'ul';
            }
            listItems.push('<li>' + unorderedMatch[2] + '</li>');
          } else if (orderedMatch) {
            if (currentList !== 'ol') {
              if (currentList === 'ul') {
                htmlContent += '<ul>' + listItems.join('') + '</ul>';
                listItems = [];
              }
              currentList = 'ol';
              startNumber = parseInt(orderedMatch[1], 10);
            }
            listItems.push('<li>' + orderedMatch[2] + '</li>');
          } else {
            if (currentList) {
              htmlContent += currentList === 'ul'
                ? '<ul>' + listItems.join('') + '</ul>'
                : `<ol start="${startNumber}">` + listItems.join('') + '</ol>';
              listItems = [];
              currentList = null;
            }

            if (line.trim() === '') {
              htmlContent += '<br>';
            } else {
              htmlContent += '<p>' + line + '</p>';
            }
          }
        }

        if (currentList) {
          htmlContent += currentList === 'ul'
            ? '<ul>' + listItems.join('') + '</ul>'
            : `<ol start="${startNumber}">` + listItems.join('') + '</ol>';
        }

        return htmlContent.replace(/<\/p><p>/g, '</p>\n<p>');
      }
    },

    API: {
      streamResponse: async function(userMessage, conversationId, messagesContainer) {
        let currentMessageElement = null;

        try {
          const promptType = window.shopChatConfig?.promptType || "standardAssistant";
          const requestBody = JSON.stringify({
            message: userMessage,
            conversation_id: conversationId,
            prompt_type: promptType,
            language: currentLang // Dil bilgisini API'ye gönder
          });

          const baseUrl = getApiEndpoint();
          const streamUrl = baseUrl.replace(/\/$/, '') + '/chat';

          const shopId = window.shopId || window.shopChatConfig?.shopId;

          if (DEBUG) {
            console.log('Making API request to:', streamUrl);
            console.log('Request headers:', {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              'X-Shopify-Shop-Id': shopId,
              'Accept-Language': currentLang
            });
          }

          const response = await fetch(streamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              'X-Shopify-Shop-Id': shopId,
              'Accept-Language': currentLang
            },
            body: requestBody
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          let messageElement = document.createElement('div');
          messageElement.classList.add('shop-ai-message', 'assistant');
          messageElement.textContent = '';
          messageElement.dataset.rawText = '';
          messagesContainer.appendChild(messageElement);
          currentMessageElement = messageElement;

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  this.handleStreamEvent(data, currentMessageElement, messagesContainer, userMessage,
                    (newElement) => { currentMessageElement = newElement; });
                } catch (e) {
                  console.error('JSON parse error:', e, line);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          console.error('Attempted URL:', streamUrl);
          ShopAIChat.UI.removeTypingIndicator();
          ShopAIChat.Message.add(getText('errorGeneral'), 'assistant', messagesContainer);
          ShopAIChat.UI.showNotification(getText('errorGeneral'), 'error');
        }
      },

      handleStreamEvent: function(data, currentMessageElement, messagesContainer, userMessage, updateCurrentElement) {
        switch (data.type) {
          case 'id':
            if (data.conversation_id) {
              sessionStorage.setItem('shopAiConversationId', data.conversation_id);
            }
            break;

          case 'chunk':
            ShopAIChat.UI.removeTypingIndicator();
            currentMessageElement.dataset.rawText += data.chunk;
            currentMessageElement.textContent = currentMessageElement.dataset.rawText;
            ShopAIChat.UI.scrollToBottom();
            break;

          case 'message_complete':
            ShopAIChat.UI.removeTypingIndicator();
            ShopAIChat.Formatting.formatMessageContent(currentMessageElement);
            ShopAIChat.UI.scrollToBottom();
            break;

          case 'end_turn':
            ShopAIChat.UI.removeTypingIndicator();
            break;

          case 'error':
            console.error('Stream error:', data.error);
            ShopAIChat.UI.removeTypingIndicator();
            currentMessageElement.textContent = getText('errorGeneral');
            ShopAIChat.UI.showNotification(getText('errorGeneral'), 'error');
            break;

          case 'rate_limit_exceeded':
            console.error('Rate limit:', data.error);
            ShopAIChat.UI.removeTypingIndicator();
            currentMessageElement.textContent = getText('errorBusy');
            ShopAIChat.UI.showNotification(getText('errorBusy'), 'error');
            break;

          case 'auth_required':
            sessionStorage.setItem('shopAiLastMessage', userMessage || '');
            break;

          case 'product_results':
            ShopAIChat.UI.displayProductResults(data.products);
            break;

          case 'tool_use':
            if (data.tool_use_message) {
              ShopAIChat.Message.addToolUse(data.tool_use_message, messagesContainer);
            }
            break;

          case 'new_message':
            ShopAIChat.Formatting.formatMessageContent(currentMessageElement);
            ShopAIChat.UI.showTypingIndicator();

            const newMessageElement = document.createElement('div');
            newMessageElement.classList.add('shop-ai-message', 'assistant');
            newMessageElement.textContent = '';
            newMessageElement.dataset.rawText = '';
            messagesContainer.appendChild(newMessageElement);

            updateCurrentElement(newMessageElement);
            break;

          case 'content_block_complete':
            ShopAIChat.UI.showTypingIndicator();
            break;
        }
      },

      fetchChatHistory: async function(conversationId, messagesContainer) {
        try {
          const loadingMessage = document.createElement('div');
          loadingMessage.classList.add('shop-ai-message', 'assistant');
          loadingMessage.textContent = getText('loadingHistory');
          messagesContainer.appendChild(loadingMessage);

          const baseUrl = getApiEndpoint();
          const historyUrl = `${baseUrl}/chat?history=true&conversation_id=${encodeURIComponent(conversationId)}`;

          if (DEBUG) {
            console.log('Fetching history from:', historyUrl);
          }

          const response = await fetch(historyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Accept-Language': currentLang
            },
            mode: 'cors'
          });

          if (!response.ok) {
            throw new Error('History fetch failed: ' + response.status);
          }

          const data = await response.json();
          messagesContainer.removeChild(loadingMessage);

          if (!data.messages || data.messages.length === 0) {
            const welcomeMessage = window.shopChatConfig?.welcomeMessage || getText('welcome');
            ShopAIChat.Message.add(welcomeMessage, 'assistant', messagesContainer);
            return;
          }

          data.messages.forEach(message => {
            try {
              const messageContents = JSON.parse(message.content);
              for (const contentBlock of messageContents) {
                if (contentBlock.type === 'text') {
                  ShopAIChat.Message.add(contentBlock.text, message.role, messagesContainer);
                }
              }
            } catch (e) {
              ShopAIChat.Message.add(message.content, message.role, messagesContainer);
            }
          });

          ShopAIChat.UI.scrollToBottom();

        } catch (error) {
          console.error('History fetch error:', error);

          const loadingMessage = messagesContainer.querySelector('.shop-ai-message.assistant');
          if (loadingMessage && loadingMessage.textContent === getText('loadingHistory')) {
            messagesContainer.removeChild(loadingMessage);
          }

          const welcomeMessage = window.shopChatConfig?.welcomeMessage || getText('welcome');
          ShopAIChat.Message.add(welcomeMessage, 'assistant', messagesContainer);
          sessionStorage.removeItem('shopAiConversationId');

          ShopAIChat.UI.showNotification(getText('noHistoryFetch'), 'error');
        }
      }
    },

    Auth: {
      openAuthPopup: function(authUrlOrElement) {
        let authUrl;
        if (typeof authUrlOrElement === 'string') {
          authUrl = authUrlOrElement;
        } else {
          authUrl = authUrlOrElement.getAttribute('data-auth-url');
          if (!authUrl) {
            console.error('No auth URL found');
            return;
          }
        }

        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2 + window.screenX;
        const top = (window.innerHeight - height) / 2 + window.screenY;

        const popup = window.open(
          authUrl,
          'ShopifyAuth',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (popup) {
          popup.focus();
        } else {
          alert(getText('authPopupBlocked'));
          return;
        }

        const conversationId = sessionStorage.getItem('shopAiConversationId');
        if (conversationId) {
          const messagesContainer = document.querySelector('.shop-ai-chat-messages');
          ShopAIChat.Message.add(getText('authInProgress'), 'assistant', messagesContainer);
          this.startTokenPolling(conversationId, messagesContainer);
        }
      },

      startTokenPolling: function(conversationId, messagesContainer) {
        if (!conversationId) return;

        const pollingId = 'polling_' + Date.now();
        sessionStorage.setItem('shopAiTokenPollingId', pollingId);

        let attemptCount = 0;
        const maxAttempts = 30;

        const poll = async () => {
          if (sessionStorage.getItem('shopAiTokenPollingId') !== pollingId) {
            return;
          }

          if (attemptCount >= maxAttempts) {
            ShopAIChat.UI.showNotification('Kimlik doğrulama zaman aşımı', 'error');
            return;
          }

          attemptCount++;

          try {
            const baseUrl = getApiEndpoint();
            const tokenUrl = baseUrl.replace(/\/$/, '') + '/auth/token-status?conversation_id=' + 
              encodeURIComponent(conversationId);
            
            if (DEBUG) {
              console.log('Polling token status:', tokenUrl);
            }

            const response = await fetch(tokenUrl);

            if (!response.ok) {
              throw new Error('Token check failed: ' + response.status);
            }

            const data = await response.json();

            if (data.status === 'authorized') {
              const message = sessionStorage.getItem('shopAiLastMessage');

              if (message) {
                sessionStorage.removeItem('shopAiLastMessage');
                setTimeout(() => {
                  ShopAIChat.Message.add(getText('authSuccess'), 'assistant', messagesContainer);
                  ShopAIChat.API.streamResponse(message, conversationId, messagesContainer);
                  ShopAIChat.UI.showTypingIndicator();
                }, 500);
              }

              sessionStorage.removeItem('shopAiTokenPollingId');
              return;
            }

            setTimeout(poll, 10000);
          } catch (error) {
            console.error('Token polling error:', error);
            setTimeout(poll, 10000);
          }
        };

        setTimeout(poll, 2000);
      }
    },

    Product: {
      createCard: function(product) {
        const card = document.createElement('div');
        card.classList.add('shop-ai-product-card');

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('shop-ai-product-image');

        const image = document.createElement('img');
        image.src = product.image_url || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
        image.alt = product.title;
        image.loading = 'lazy'; // Lazy loading ekle
        image.onerror = function() {
          this.src = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
        };
        imageContainer.appendChild(image);
        card.appendChild(imageContainer);

        const info = document.createElement('div');
        info.classList.add('shop-ai-product-info');

        const title = document.createElement('h3');
        title.classList.add('shop-ai-product-title');
        title.textContent = product.title;

        if (product.url) {
          const titleLink = document.createElement('a');
          titleLink.href = product.url;
          titleLink.target = '_blank';
          titleLink.rel = 'noopener noreferrer';
          titleLink.textContent = product.title;
          title.textContent = '';
          title.appendChild(titleLink);
        }

        info.appendChild(title);

        const price = document.createElement('p');
        price.classList.add('shop-ai-product-price');
        price.textContent = product.price;
        info.appendChild(price);

        const button = document.createElement('button');
        button.classList.add('shop-ai-add-to-cart');
        button.textContent = getText('addToCart');
        button.dataset.productId = product.id;

        button.addEventListener('click', function() {
          const input = document.querySelector('.shop-ai-chat-input input');
          if (input) {
            const addMessage = currentLang === 'tr' 
              ? `${product.title} ürünü sepetime ekle`
              : `Add ${product.title} to my cart`;
            input.value = addMessage;
            
            const sendButton = document.querySelector('.shop-ai-chat-send');
            if (sendButton) {
              sendButton.click();
            }
          }
        });

        info.appendChild(button);
        card.appendChild(info);

        return card;
      }
    },

    // Dil değiştirme fonksiyonu ekle
    setLanguage: function(lang) {
      if (TEXTS[lang]) {
        currentLang = lang;
        this.UI.setupPlaceholder();
        // Dil değişikliğini local storage'a kaydet
        localStorage.setItem('shopChatLanguage', lang);
      }
    },

    init: function() {
      // Saved language'ı kontrol et
      const savedLang = localStorage.getItem('shopChatLanguage');
      if (savedLang && TEXTS[savedLang]) {
        currentLang = savedLang;
      }

      const container = document.querySelector('.shop-ai-chat-container');
      if (!container) return;

      this.UI.init(container);

      const conversationId = sessionStorage.getItem('shopAiConversationId');

      if (conversationId) {
        this.API.fetchChatHistory(conversationId, this.UI.elements.messagesContainer);
      } else {
        const welcomeMessage = window.shopChatConfig?.welcomeMessage || getText('welcome');
        this.Message.add(welcomeMessage, 'assistant', this.UI.elements.messagesContainer);
      }
    }
  };

  // CSS animasyonları ekle
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Global olarak dil değiştirme fonksiyonunu expose et
  window.ShopAIChat = ShopAIChat;

  document.addEventListener('DOMContentLoaded', function() {
    ShopAIChat.init();
  });
})();