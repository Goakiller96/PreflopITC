// ===================== main.js (ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ) =====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Preflop Trainer запущен');

    // ---------- Элементы ----------
    const setupPanel = document.getElementById('setupPanel');
    const gamePanel = document.getElementById('gamePanel');
    const startBtn = document.getElementById('startBtn');
    const allPositionsCheck = document.getElementById('allPositions');
    const playerHand = document.getElementById('playerHand');
    const currentPositionEl = document.getElementById('currentPosition');
    const resultPanel = document.getElementById('resultPanel');
    const resultMessage = document.getElementById('resultMessage');
    const nextBtn = document.getElementById('nextBtn');
    const foldBtn = document.getElementById('foldBtn');
    const raiseBtn = document.getElementById('raiseBtn');
    const sessionCorrectSpan = document.getElementById('sessionCorrect');
    const sessionTotalSpan = document.getElementById('sessionTotal');
    const sessionPercentSpan = document.getElementById('sessionPercent');
    const situationInfo = document.getElementById('situationInfo');
    const actionsPanel = document.getElementById('actionsPanel');
    const raiseSizeBlock = document.getElementById('raiseSizeBlock');
    const errorModeIndicator = document.getElementById('errorModeIndicator');
    
    // ---------- Элементы статистики ----------
    const statsModal = document.getElementById('statsModal');
    const statsBtn = document.getElementById('statsBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const resetStatsBtn = document.getElementById('resetStatsBtn');
    const reviewErrorsBtn = document.getElementById('reviewErrorsBtn');
    const totalHandsSpan = document.getElementById('totalHands');
    const correctHandsSpan = document.getElementById('correctHands');
    const accuracySpan = document.getElementById('accuracy');
    const errorCountSpan = document.getElementById('errorCount');

    // ---------- Переменные ----------
    let selectedPositions = [];
    let currentHand = null;
    let currentHandResolved = false;
    let currentMode = 'rfi';
    let selectedRaiseSize = '3';
    let stats = { total: 0, correct: 0 };
    let sessionStats = { total: 0, correct: 0 };
    
    // Массив для хранения ошибок
    let errorHands = [];
    let isErrorMode = false;
    let currentErrorIndex = 0;

    // ==================== КОЛОДА ====================
    const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
    const suits = [
        { symbol: '♠', color: '#000000', name: 'spades' },
        { symbol: '♥', color: '#e62e2e', name: 'hearts' },
        { symbol: '♦', color: '#3973e6', name: 'diamonds' },
        { symbol: '♣', color: '#2eb82e', name: 'clubs' }
    ];

    const positionNames = { ep: 'EP', mp: 'MP', co: 'CO', btn: 'BTN', sb: 'SB', bb: 'BB' };
    const positionOrder = ['ep', 'mp', 'co', 'btn', 'sb', 'bb'];
    
    function isInPosition(heroPos, villainPos) {
        return positionOrder.indexOf(heroPos) > positionOrder.indexOf(villainPos);
    }

    // ==================== ПАРСЕР ДИАПАЗОНОВ ====================
    const RANK_ORDER = 'AKQJT98765432';

    function expandRange(notation) {
        const hands = new Set();
        if (!notation) return hands;

        const parts = notation.replace(/\s+/g, '').split(',');

        parts.forEach(part => {
            if (!part) return;

            // Pair range: AA-77
            if (/^[AKQJT98765432]{2}-[AKQJT98765432]{2}$/.test(part) && part[0] === part[1]) {
                const from = RANK_ORDER.indexOf(part[0]);
                const to   = RANK_ORDER.indexOf(part[3]);
                for (let i = from; i <= to; i++) {
                    hands.add(RANK_ORDER[i] + RANK_ORDER[i]);
                }
                return;
            }

            // Suited range: AKs-A2s, KQs-K9s
            if (/^[AKQJT98765432][AKQJT98765432]s-[AKQJT98765432][AKQJT98765432]s$/.test(part)) {
                const high1 = part[0], low1 = part[1];
                const high2 = part[4], low2 = part[5];
                if (high1 === high2) {
                    const from = RANK_ORDER.indexOf(low1);
                    const to   = RANK_ORDER.indexOf(low2);
                    for (let i = from; i <= to; i++) {
                        hands.add(high1 + RANK_ORDER[i] + 's');
                    }
                }
                return;
            }

            // Offsuit range: AKo-ATo, KQo-KJo
            if (/^[AKQJT98765432][AKQJT98765432]o-[AKQJT98765432][AKQJT98765432]o$/.test(part)) {
                const high1 = part[0], low1 = part[1];
                const high2 = part[4], low2 = part[5];
                if (high1 === high2) {
                    const from = RANK_ORDER.indexOf(low1);
                    const to   = RANK_ORDER.indexOf(low2);
                    for (let i = from; i <= to; i++) {
                        hands.add(high1 + RANK_ORDER[i] + 'o');
                    }
                }
                return;
            }

            // Single hand: AA, AKs, AKo, JTs, 76s
            if (/^[AKQJT98765432]{2}[so]?$/.test(part)) {
                hands.add(part);
                return;
            }
        });

        return hands;
    }

    // ==================== RFI ДИАПАЗОНЫ (НОВЫЕ) ====================
    const rfiRanges = {
        ep:  expandRange('AA-77,AKs-A2s,KQs-K9s,QJs-QTs,JTs,AKo-ATo,KQo-KJo'),
        mp:  expandRange('AA-66,AKs-A2s,KQs-K8s,QJs-Q9s,JTs-J9s,T9s,AKo-ATo,KQo-KTo,QJo'),
        co:  expandRange('AA-55,AKs-A2s,KQs-K4s,QJs-Q8s,JTs-J8s,T9s-T8s,98s,AKo-A9o,KQo-KTo,QJo-QTo,JTo'),
        btn: expandRange('AA-22,AKs-A2s,KQs-K2s,QJs-Q5s,JTs-J6s,T9s-T6s,98s-96s,87s-86s,76s-75s,65s,54s,AKo-A4o,KQo-K9o,QJo-Q9o,JTo-J9o,T9o'),
        sb:  expandRange('AA-22,AKs-A2s,KQs-K2s,QJs-Q2s,JTs-J5s,T9s-T6s,98s-96s,87s-85s,76s-74s,65s-64s,54s,AKo-A3o,KQo-K9o,QJo-Q9o,JTo-J9o,T9o')
    };

    // ==================== ДИАПАЗОНЫ ЗАЩИТЫ BB (НОВЫЕ) ====================
    const bbDefense = {
        ep: {
            call:  expandRange('99-22,ATs-A2s,KTs-K8s,QTs-Q9s,JTs-J9s,T9s-T8s,98s-97s,87s-86s,76s-75s,65s-64s,54s,AJo'),
            three: expandRange('AA-TT,AKs-AJs,KQs-KJs,QJs,AKo-AQo,KQo')
        },
        mp: {
            call:  expandRange('88-22,A9s-A6s,A3s-A2s,K9s-K6s,Q9s,J9s,T9s-T8s,98s-97s,87s-86s,76s-75s,65s-64s,54s,AJo-ATo,KJo'),
            three: expandRange('AA-TT,AKs-AJs,A5s-A4s,KQs-KJs,QJs,AKo-AQo,KQo')
        },
        co: {
            call:  expandRange('99-22,ATs-A6s,A3s-A2s,K9s-K2s,QTs-Q8s,JTs-J8s,T9s-T8s,98s-97s,87s-86s,76s-75s,65s-64s,54s-53s,43s,ATo,KJo-KTo,QJo'),
            three: expandRange('AA-TT,AKs-ATs,A5s-A4s,KQs-KTs,QJs,AKo-AJo,KQo')
        },
        btn: {
            call:  expandRange('88-22,A8s-A6s,A3s-A2s,K8s-K2s,Q9s-Q2s,J9s-J7s,T9s-T7s,98s-97s,87s-86s,76s-75s,65s-64s,54s-53s,43s,A9o-A8o,A5o,KTo-K9o,QJo-QTo,JTo'),
            three: expandRange('AA-99,AKs-A9s,A5s-A4s,KQs-K9s,QJs-QTs,JTs,AKo-ATo,KQo-KJo')
        },
        sb: {
            call:  expandRange('88-22,A9s-A2s,K9s-K2s,Q9s-Q2s,J9s-J5s,T8s-T6s,97s-96s,86s-85s,75s-74s,64s,53s,43s,ATo-A8o,KTo,QJo-QTo,JTo,T9o'),
            three: expandRange('AA-88,AKs-ATs,KQs-KTs,QJs-QTs,JTs,T9s,98s,87s,76s,65s,54s,AKo-AJo,A7o-A5o,KQo,K9o,Q9o,J9o')
        }
    };

    function getDefendBBAction(handCode, raiseSize, villainPos) {
        const def = bbDefense[villainPos];
        if (!def) return 'fold';

        if (def.three.has(handCode)) return 'raise';   // 3-bet
        if (def.call.has(handCode))  return 'call';
        return 'fold';
    }

    // ==================== ФУНКЦИИ ОТОБРАЖЕНИЯ ====================
    
        // ---------- Popup с изображением диапазона ----------
    const rangePopup = document.getElementById('rangePopup');
    const rangePopupImg = document.getElementById('rangePopupImg');
    const rangePopupTitle = document.getElementById('rangePopupTitle');

    // Пути относительно index.html (главная папка проекта)
    const pfrImages = {
        ep:  'IMG/PFR/EP_pfr.jpg',
        mp:  'IMG/PFR/MP_pfr.jpg',
        co:  'IMG/PFR/CO_pfr.jpg',
        btn: 'IMG/PFR/BTN_pfr.jpg',
        sb:  'IMG/PFR/SB_pfr.jpg'
    };

    let currentVillainPos = null;

    function showRangePopup(position, clientX, clientY) {
        const src = pfrImages[position];
        if (!src) {
            console.warn('[Range] Нет пути для позиции:', position);
            return;
        }
        if (!rangePopup || !rangePopupImg) {
            console.warn('[Range] Элемент #rangePopup не найден в HTML');
            return;
        }

        if (rangePopupImg.getAttribute('data-pos') !== position) {
            rangePopupImg.setAttribute('data-pos', position);
            rangePopupImg.src = src;
            rangePopupImg.onerror = function () {
                console.error('[Range] Не загрузилось:', src, '— проверь путь и имя файла');
                if (rangePopupTitle) {
                    rangePopupTitle.textContent = 'Не найден: ' + src;
                }
            };
            rangePopupImg.onload = function () {
                console.log('[Range] Загружено:', src);
            };
        }

        if (rangePopupTitle) {
            rangePopupTitle.textContent = (positionNames[position] || position.toUpperCase()) + ' Open Raise';
        }

        rangePopup.classList.add('visible');
        rangePopup.style.display = 'block';

        const pad = 12;
        let x = (typeof clientX === 'number' ? clientX : 100) + pad;
        let y = (typeof clientY === 'number' ? clientY : 100) + pad;

        // сдвигаем после показа, чтобы знать реальный размер
        requestAnimationFrame(function () {
            const rect = rangePopup.getBoundingClientRect();
            const w = rect.width || 500;
            const h = rect.height || 380;
            if (x + w > window.innerWidth - pad) x = window.innerWidth - w - pad;
            if (y + h > window.innerHeight - pad) y = Math.max(pad, (clientY || 100) - h - pad);
            if (x < pad) x = pad;
            if (y < pad) y = pad;
            rangePopup.style.left = x + 'px';
            rangePopup.style.top = y + 'px';
        });
    }

    function hideRangePopup() {
        if (rangePopup) {
            rangePopup.classList.remove('visible');
            rangePopup.style.display = 'none';
        }
    }

    function clearBetsOnTable() {
        document.querySelectorAll('.bet-chip').forEach(function (el) {
            el.classList.remove('visible');
            el.textContent = '';
        });
        document.querySelectorAll('.position').forEach(function (pos) {
            pos.classList.remove('position--villain');
            pos.style.borderColor = '';
            pos.style.boxShadow = '';
        });
        currentVillainPos = null;
        hideRangePopup();
    }

    function showBetOnPosition(position, betSize) {
        clearBetsOnTable();
        currentVillainPos = position;

        const betChip = document.querySelector('.position-wrapper--' + position + ' .bet-chip');
        if (betChip) {
            betChip.textContent = betSize + ' BB';
            betChip.classList.add('visible');
        }

        const posElement = document.querySelector('.position[data-pos="' + position + '"]');
        if (posElement) {
            posElement.classList.add('position--villain');
            console.log('[Range] Рейзер отмечен:', position, '→', pfrImages[position]);
        } else {
            console.warn('[Range] Не найден элемент позиции:', position);
        }
    }

        // Наведение на ЛЮБУЮ позицию → показать её open-raise чарт
    // (в т.ч. на рейзера в режиме защиты BB / 3bet)
    document.addEventListener('mouseover', function (e) {
        const posEl = e.target.closest('.position[data-pos]');
        if (!posEl) return;

        const pos = posEl.getAttribute('data-pos');
        // Для BB нет open-raise картинки
        if (!pos || pos === 'bb' || !pfrImages[pos]) return;

        showRangePopup(pos, e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', function (e) {
        if (!rangePopup || !rangePopup.classList.contains('visible')) return;

        const posEl = e.target.closest('.position[data-pos]');
        if (!posEl) return;

        const pos = posEl.getAttribute('data-pos');
        if (!pos || pos === 'bb' || !pfrImages[pos]) return;

        showRangePopup(pos, e.clientX, e.clientY);
    });

    document.addEventListener('mouseout', function (e) {
        const posEl = e.target.closest('.position[data-pos]');
        if (!posEl) return;

        const related = e.relatedTarget;
        // если ушли на дочерний элемент той же позиции — не скрываем
        if (related && posEl.contains(related)) return;
        // если перешли на другую позицию — mouseover сам покажет новую
        if (related && related.closest && related.closest('.position[data-pos]')) return;

        hideRangePopup();
    });

    function getHandCode(card1, card2) {
        const rankOrder = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};
        let r1 = card1.rank, r2 = card2.rank;
        let highRank = rankOrder[r1] >= rankOrder[r2] ? r1 : r2;
        let lowRank = rankOrder[r1] >= rankOrder[r2] ? r2 : r1;
        if (highRank === lowRank) return highRank + lowRank;
        const isSuited = (card1.suit.name === card2.suit.name);
        return highRank + lowRank + (isSuited ? 's' : 'o');
    }

    function getRandomCard() {
        return {
            rank: ranks[Math.floor(Math.random() * ranks.length)],
            suit: suits[Math.floor(Math.random() * suits.length)]
        };
    }

    function generateHand() {
        let c1, c2;
        do {
            c1 = getRandomCard();
            c2 = getRandomCard();
        } while (c1.rank === c2.rank && c1.suit.name === c2.suit.name);
        return [c1, c2];
    }

    function renderHand(hand) {
        playerHand.innerHTML = '';
        hand.forEach(card => {
            let el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = '<div style="color: ' + card.suit.color + ';">' + card.rank + '</div><div class="card__suit" style="color: ' + card.suit.color + ';">' + card.suit.symbol + '</div>';
            playerHand.appendChild(el);
        });
    }

    // ==================== ГЕНЕРАЦИЯ СИТУАЦИЙ ====================
    
    function generateRfiSituation() {
        const rfiPositions = selectedPositions.filter(p => p !== 'bb');
        const heroPos = rfiPositions.length > 0 ? rfiPositions[Math.floor(Math.random() * rfiPositions.length)] : 'ep';
        const cards = generateHand();
        const handCode = getHandCode(cards[0], cards[1]);
        const correctAction = rfiRanges[heroPos] && rfiRanges[heroPos].has(handCode) ? 'raise' : 'fold';
        return { cards, handCode, heroPos, correctAction };
    }

    function generateThreebetSituation() {
        const heroPos = selectedPositions[Math.floor(Math.random() * selectedPositions.length)];
        const availableVillains = selectedPositions.filter(p => positionOrder.indexOf(p) < positionOrder.indexOf(heroPos));
        let villainPos = availableVillains.length > 0 ? availableVillains[Math.floor(Math.random() * availableVillains.length)] : selectedPositions.filter(p => p !== heroPos)[0];
        const isIP = isInPosition(heroPos, villainPos);
        const raiseSize = isIP ? 3 : 4;
        const cards = generateHand();
        const handCode = getHandCode(cards[0], cards[1]);
        const correctAction = rfiRanges[heroPos] && rfiRanges[heroPos].has(handCode) ? '3bet' : 'fold';
        return { cards, handCode, heroPos, villainPos, raiseSize, correctAction };
    }

    function generateVsThreebetSituation() {
        const heroPos = selectedPositions[Math.floor(Math.random() * selectedPositions.length)];
        const villainPos = selectedPositions.filter(p => p !== heroPos)[Math.floor(Math.random() * (selectedPositions.length - 1))];
        const isIP = isInPosition(villainPos, heroPos);
        const threebetSize = isIP ? 3 : 4;
        const cards = generateHand();
        const handCode = getHandCode(cards[0], cards[1]);
        let correctAction = 'fold';
        return { cards, handCode, heroPos, villainPos, threebetSize, correctAction };
    }

    function generateIsolateSituation() {
        const heroPos = selectedPositions[Math.floor(Math.random() * selectedPositions.length)];
        const limperPos = selectedPositions.filter(p => p !== heroPos)[Math.floor(Math.random() * (selectedPositions.length - 1))];
        const cards = generateHand();
        const handCode = getHandCode(cards[0], cards[1]);
        let correctAction = 'fold';
        return { cards, handCode, heroPos, limperPos, correctAction };
    }

    function generateDefendBBSituation() {
        const heroPos = 'bb';
        const availableVillains = selectedPositions.filter(p => p !== 'bb');
        let villainPos = availableVillains.length > 0 
            ? availableVillains[Math.floor(Math.random() * availableVillains.length)] 
            : 'ep';
        
        let raiseSize;
        if (selectedRaiseSize === 'both') {
            raiseSize = Math.random() < 0.5 ? 2.5 : 3;
        } else {
            raiseSize = parseFloat(selectedRaiseSize);
        }
        
        const cards = generateHand();
        const handCode = getHandCode(cards[0], cards[1]);
        const correctAction = getDefendBBAction(handCode, raiseSize, villainPos);
        
        return { cards, handCode, heroPos, villainPos, raiseSize, correctAction };
    }

    // ==================== УПРАВЛЕНИЕ ВИДИМОСТЬЮ ПОЗИЦИЙ ====================
    
    function updatePositionsVisibility() {
        const bbCheckbox = document.querySelector('.pos-check[value="bb"]');
        const bbLabel = bbCheckbox ? bbCheckbox.parentElement : null;
        
        if (!bbCheckbox) return;
        
        if (currentMode === 'rfi' || currentMode === 'defend_bb') {
            if (bbLabel) bbLabel.style.display = 'none';
            if (bbCheckbox.checked) {
                bbCheckbox.checked = false;
            }
        } else {
            if (bbLabel) bbLabel.style.display = '';
        }
        
        const visibleCheckboxes = document.querySelectorAll('.pos-check:not([style*="display: none"])');
        const allChecked = visibleCheckboxes.length === document.querySelectorAll('.pos-check:not([style*="display: none"]):checked').length;
        if (allPositionsCheck) allPositionsCheck.checked = allChecked;
    }

    // ==================== ФУНКЦИИ РАБОТЫ С ОШИБКАМИ ====================
    
    function addErrorToList(handData) {
        errorHands.unshift({
            handCode: handData.handCode,
            position: handData.position,
            villainPos: handData.villainPos,
            raiseSize: handData.raiseSize,
            correctAction: handData.correctAction,
            mode: handData.mode,
            timestamp: Date.now()
        });
        updateErrorCountDisplay();
        saveErrorsToLocalStorage();
    }
    
    function removeErrorFromList(index) {
        errorHands.splice(index, 1);
        updateErrorCountDisplay();
        saveErrorsToLocalStorage();
    }
    
    function updateErrorCountDisplay() {
        if (errorCountSpan) {
            errorCountSpan.textContent = errorHands.length;
        }
    }
    
    function saveErrorsToLocalStorage() {
        localStorage.setItem('pokerErrors', JSON.stringify(errorHands));
    }
    
    function loadErrorsFromLocalStorage() {
        const saved = localStorage.getItem('pokerErrors');
        if (saved) {
            errorHands = JSON.parse(saved);
            updateErrorCountDisplay();
        }
    }
    
    function generateHandFromCode(handCode) {
        const rank1 = handCode[0];
        const rank2 = handCode[1];
        const isSuited = handCode.includes('s');
        const isPair = (rank1 === rank2);
        
        let card1 = { rank: rank1, suit: suits[0] };
        let card2 = { rank: rank2, suit: suits[0] };
        
        if (isPair) {
            let suit1, suit2;
            do {
                suit1 = suits[Math.floor(Math.random() * suits.length)];
                suit2 = suits[Math.floor(Math.random() * suits.length)];
            } while (suit1.name === suit2.name);
            card1.suit = suit1;
            card2.suit = suit2;
        } else if (isSuited) {
            const suit = suits[Math.floor(Math.random() * suits.length)];
            card1.suit = suit;
            card2.suit = suit;
        } else {
            let suit1, suit2;
            do {
                suit1 = suits[Math.floor(Math.random() * suits.length)];
                suit2 = suits[Math.floor(Math.random() * suits.length)];
            } while (suit1.name === suit2.name);
            card1.suit = suit1;
            card2.suit = suit2;
        }
        
        return [card1, card2];
    }
    
    function startErrorReview() {
        if (errorHands.length === 0) {
            showTemporaryMessage('🎉 Отличная работа! Нет ошибок для повторения!', '#00ff9d');
            if (statsModal) statsModal.style.display = 'none';
            return;
        }
        
        isErrorMode = true;
        currentErrorIndex = 0;
        
        if (errorModeIndicator) {
            errorModeIndicator.style.display = 'inline-block';
        }
        
        if (statsModal) statsModal.style.display = 'none';
        if (setupPanel) setupPanel.style.display = 'none';
        if (gamePanel) gamePanel.style.display = 'flex';
        setModesVisible(false);
        
        clearBetsOnTable();
        if (resultPanel) resultPanel.classList.remove('active');
        if (resultMessage) resultMessage.innerHTML = '';
        
        loadErrorForReview();
    }
    
    function loadErrorForReview() {
        if (errorHands.length === 0) {
            finishErrorReview();
            return;
        }
        if (currentErrorIndex >= errorHands.length) {
            currentErrorIndex = 0;
        }
        
        clearBetsOnTable();
        if (resultPanel) resultPanel.classList.remove('active');
        if (resultMessage) resultMessage.innerHTML = '';
        
        const error = errorHands[currentErrorIndex];
        currentMode = error.mode;
        
        const cards = generateHandFromCode(error.handCode);
        
        currentHand = {
            cards: cards,
            position: error.position,
            handCode: error.handCode,
            correctAction: error.correctAction,
            situation: {
                heroPos: error.position,
                villainPos: error.villainPos,
                raiseSize: error.raiseSize
            },
            isErrorReview: true,
            errorIndex: currentErrorIndex
        };
        currentHandResolved = false;
        
        if (currentPositionEl) currentPositionEl.innerHTML = '';
        
        document.querySelectorAll('.position').forEach(pos => {
            pos.classList.remove('position--active');
            if (pos.dataset.pos === error.position) {
                pos.classList.add('position--active');
            }
        });
        
        renderHand(cards);
        
        let actionText = '';
        if (error.mode === 'defend_bb') {
            actionText = '🔄 ПОВТОР: ' + positionNames[error.villainPos] + ' открылся ' + error.raiseSize + 'bb. Защита BB.';
            showBetOnPosition(error.villainPos, error.raiseSize);
        } else if (error.mode === '3bet') {
            actionText = '🔄 ПОВТОР: ' + positionNames[error.villainPos] + ' открылся ' + error.raiseSize + 'bb. Ваш 3-бет?';
            showBetOnPosition(error.villainPos, error.raiseSize);
        } else if (error.mode === 'rfi') {
            actionText = '';
            clearBetsOnTable();
        } else {
            actionText = '🔄 ПОВТОР ошибки. Ваше действие?';
        }
        
        if (situationInfo) situationInfo.innerHTML = actionText;
        renderActions(error.mode, { raiseSize: error.raiseSize });
    }
    
    function finishErrorReview() {
        // Выходим из режима ошибок только когда список пуст
        if (errorHands.length > 0) {
            currentErrorIndex = 0;
            loadErrorForReview();
            return;
        }

        isErrorMode = false;
        currentErrorIndex = 0;
        
        if (errorModeIndicator) {
            errorModeIndicator.style.display = 'none';
        }
        
        showTemporaryMessage('🎉 Отлично! Все ошибки исправлены!', '#00ff9d', 3000);
        startNewHand();
    }
    
    function showTemporaryMessage(message, color, duration = 2000, callback = null) {
        if (!resultMessage || !resultPanel) return;
        resultMessage.innerHTML = message;
        resultMessage.style.color = color;
        resultPanel.classList.add('active');
        setTimeout(() => {
            resultPanel.classList.remove('active');
            if (callback) callback();
        }, duration);
    }
    
    function handleAnswerInErrorMode(selectedAction) {
        if (currentHandResolved) return;
        if (!errorHands.length) {
            finishErrorReview();
            return;
        }
        
        const error = errorHands[currentErrorIndex];
        if (!error) {
            currentErrorIndex = 0;
            loadErrorForReview();
            return;
        }

        const isCorrect = (selectedAction === error.correctAction);
        const actionNames = { fold: 'ФОЛД', call: 'КОЛЛ', raise: 'РЕЙЗ', '3bet': '3БЕТ', '4bet': '4БЕТ', random: '50/50' };
        
        if (isCorrect) {
            // Удаляем текущую ошибку; индекс остаётся на том же месте (туда сдвинется следующая)
            removeErrorFromList(currentErrorIndex);
            resultMessage.innerHTML = '✅ ПРАВИЛЬНО! Ошибка исправлена! Осталось: ' + errorHands.length;
            resultMessage.style.color = '#00ff9d';
            currentHandResolved = true;
            resultPanel.classList.add('active');
            
            setTimeout(() => {
                resultPanel.classList.remove('active');
                if (errorHands.length === 0) {
                    finishErrorReview();
                } else {
                    if (currentErrorIndex >= errorHands.length) {
                        currentErrorIndex = 0;
                    }
                    loadErrorForReview();
                }
            }, 1000);
        } else {
            // Неверно — показываем ответ и идём к следующей ошибке в списке (по кругу)
            const correctText = actionNames[error.correctAction] || error.correctAction;
            resultMessage.innerHTML = '❌ СНОВА НЕПРАВИЛЬНО!<br>Правильно: ' + correctText;
            resultMessage.style.color = '#ff9999';
            currentHandResolved = true;
            resultPanel.classList.add('active');
            
            setTimeout(() => {
                resultPanel.classList.remove('active');
                if (errorHands.length === 0) {
                    finishErrorReview();
                    return;
                }
                currentErrorIndex = (currentErrorIndex + 1) % errorHands.length;
                loadErrorForReview();
            }, 2000);
        }
        
        updateErrorCountDisplay();
    }

    // ==================== ОСНОВНЫЕ ФУНКЦИИ ====================
    
    function renderActions(mode, context = {}) {
        if (!actionsPanel) return;

        const actionConfigs = {
            rfi: { buttons: ['fold', 'raise'], names: { fold: '✗ FOLD', raise: '▲ RAISE' } },
            '3bet': { buttons: ['fold', 'call', '3bet'], names: { fold: '✗ FOLD', call: '○ CALL', '3bet': '▲ 3BET (' + (context.raiseSize || 3) + 'x)' } },
            vs3bet: { buttons: ['fold', 'call', '4bet'], names: { fold: '✗ FOLD', call: '○ CALL', '4bet': '▲ 4BET' } },
            isolate: { buttons: ['fold', 'call', 'raise'], names: { fold: '✗ FOLD', call: '○ CALL', raise: '▲ RAISE' } },
            defend_bb: { 
                buttons: ['fold', 'call', 'raise'], 
                names: { 
                    fold: '✗ FOLD', 
                    call: '○ CALL (' + (context.raiseSize || 2.5) + 'bb)', 
                    raise: '▲ 3BET' 
                } 
            }
        };
        
        const config = actionConfigs[mode];
        if (!config) return;
        
        const actionButtons = {
            fold: '<button class="action-btn action-btn--fold" data-action="fold">' + config.names.fold + '</button>',
            call: '<button class="action-btn action-btn--call" data-action="call">' + config.names.call + '</button>',
            random: '<button class="action-btn action-btn--random" data-action="random">' + (config.names.random || '') + '</button>',
            raise: '<button class="action-btn action-btn--raise" data-action="raise">' + config.names.raise + '</button>',
            '3bet': '<button class="action-btn action-btn--3bet" data-action="3bet">' + config.names['3bet'] + '</button>',
            '4bet': '<button class="action-btn action-btn--4bet" data-action="4bet">' + config.names['4bet'] + '</button>'
        };
        
        let html = '';
        config.buttons.forEach(action => { html += actionButtons[action] || ''; });
        actionsPanel.innerHTML = html;
        
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => handleAnswer(btn.dataset.action));
        });
    }

    function updateSessionStatsUI() {
        if (!sessionCorrectSpan) return;
        sessionCorrectSpan.textContent = sessionStats.correct;
        sessionTotalSpan.textContent = sessionStats.total;
        let percent = sessionStats.total === 0 ? 0 : Math.round((sessionStats.correct / sessionStats.total) * 100);
        sessionPercentSpan.textContent = percent;
    }

    function updateGlobalStatsModal() {
        if (!totalHandsSpan) return;
        totalHandsSpan.textContent = stats.total;
        correctHandsSpan.textContent = stats.correct;
        let percent = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
        accuracySpan.textContent = percent + '%';
    }

    function saveStats() { localStorage.setItem('pokerStats', JSON.stringify(stats)); }
    
    function loadStats() {
        let saved = localStorage.getItem('pokerStats');
        stats = saved ? JSON.parse(saved) : { total: 0, correct: 0 };
        updateGlobalStatsModal();
    }
    
    function resetStats() {
        stats = { total: 0, correct: 0 };
        sessionStats = { total: 0, correct: 0 };
        errorHands = [];
        saveStats();
        saveErrorsToLocalStorage();
        updateGlobalStatsModal();
        updateSessionStatsUI();
        updateErrorCountDisplay();
        if (resultPanel) resultPanel.classList.remove('active');
        if (gamePanel && gamePanel.style.display === 'block') startNewHand();
        showTemporaryMessage('🗑 Статистика и ошибки сброшены', '#00ff9d', 2000);
    }
    
    function setModesVisible(visible) {
        const modes = document.querySelector('.modes');
        if (modes) modes.style.display = visible ? '' : 'none';
    }

    function resetToSetupScreen() {
        if (isErrorMode) {
            isErrorMode = false;
            currentErrorIndex = 0;
            if (errorModeIndicator) {
                errorModeIndicator.style.display = 'none';
            }
            clearBetsOnTable();
        }
        // Убираем inline-стили — вид как при первой загрузке страницы
        if (setupPanel) setupPanel.style.display = '';
        if (gamePanel) gamePanel.style.display = 'none';
        setModesVisible(true);
        currentHand = null;
        currentHandResolved = false;
        if (resultPanel) {
            resultPanel.classList.remove('active');
            resultPanel.style.display = '';
        }
        if (resultMessage) resultMessage.innerHTML = '';
        if (situationInfo) situationInfo.innerHTML = '';
        if (actionsPanel) actionsPanel.innerHTML = '';
        if (playerHand) playerHand.innerHTML = '';
        if (currentPositionEl) currentPositionEl.innerHTML = '';
        clearBetsOnTable();
        hideRangePopup();
        updatePositionsVisibility();
    }

    function startNewHand() {
        if (selectedPositions.length === 0 && !isErrorMode) return;
        if (isErrorMode) return;
        
        clearBetsOnTable();
        
        let situation;
        let context = {};
        
        switch(currentMode) {
            case 'rfi':
                situation = generateRfiSituation();
                break;
            case '3bet':
                situation = generateThreebetSituation();
                context = { raiseSize: situation.raiseSize };
                showBetOnPosition(situation.villainPos, situation.raiseSize);
                break;
            case 'vs3bet':
                situation = generateVsThreebetSituation();
                context = { threebetSize: situation.threebetSize };
                showBetOnPosition(situation.villainPos, situation.threebetSize);
                break;
            case 'isolate':
                situation = generateIsolateSituation();
                showBetOnPosition(situation.limperPos, 1);
                break;
            case 'defend_bb':
                situation = generateDefendBBSituation();
                context = { raiseSize: situation.raiseSize };
                showBetOnPosition(situation.villainPos, situation.raiseSize);
                break;
            default:
                situation = generateRfiSituation();
        }
        
        currentHand = {
            cards: situation.cards,
            position: situation.heroPos,
            handCode: situation.handCode,
            correctAction: situation.correctAction,
            situation: situation
        };
        currentHandResolved = false;
        
        if (currentPositionEl) currentPositionEl.innerHTML = '';
        
        document.querySelectorAll('.position').forEach(pos => {
            pos.classList.remove('position--active');
            if (pos.dataset.pos === situation.heroPos) {
                pos.classList.add('position--active');
            }
        });
        
        renderHand(situation.cards);
        renderActions(currentMode, context);

        // Текст ситуации
        if (situationInfo) {
            if (currentMode === 'defend_bb') {
                situationInfo.innerHTML = positionNames[situation.villainPos] + ' открылся на ' + situation.raiseSize + 'bb. Защита BB.';
            } else if (currentMode === 'rfi') {
                situationInfo.innerHTML = '';
            } else if (currentMode === '3bet') {
                situationInfo.innerHTML = positionNames[situation.villainPos] + ' открылся на ' + situation.raiseSize + 'bb. Ваш 3-bet?';
            } else {
                situationInfo.innerHTML = '';
            }
        }

        if (resultPanel) resultPanel.classList.remove('active');
        if (resultMessage) resultMessage.innerHTML = '';
    }

    function handleAnswer(selectedAction) {
        if (currentHandResolved) return;
        if (!currentHand) return;
        
        if (isErrorMode) {
            handleAnswerInErrorMode(selectedAction);
            return;
        }
        
        let isCorrect = (selectedAction === currentHand.correctAction);
        currentHandResolved = true;
        
        stats.total++;
        if (isCorrect) {
            stats.correct++;
        } else {
            addErrorToList({
                handCode: currentHand.handCode,
                position: currentHand.position,
                villainPos: currentHand.situation ? currentHand.situation.villainPos : null,
                raiseSize: currentHand.situation ? currentHand.situation.raiseSize : null,
                correctAction: currentHand.correctAction,
                mode: currentMode
            });
        }
        sessionStats.total++;
        if (isCorrect) sessionStats.correct++;
        
        saveStats();
        updateGlobalStatsModal();
        updateSessionStatsUI();
        
        const actionNames = { fold: 'ФОЛД', call: 'КОЛЛ', raise: 'РЕЙЗ', '3bet': '3БЕТ', '4bet': '4БЕТ', random: '50/50' };
        
        if (isCorrect) {
            resultMessage.innerHTML = '✅ ПРАВИЛЬНО!';
            resultMessage.style.color = '#00ff9d';
        } else {
            let correctText = actionNames[currentHand.correctAction] || currentHand.correctAction;
            resultMessage.innerHTML = '❌ НЕПРАВИЛЬНО!<br>Правильно: ' + correctText;
            resultMessage.style.color = '#ff9999';
        }
        
        resultPanel.classList.add('active');
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    function initModeButtons() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (isErrorMode) {
                    isErrorMode = false;
                    currentErrorIndex = 0;
                    if (errorModeIndicator) {
                        errorModeIndicator.style.display = 'none';
                    }
                    clearBetsOnTable();
                    showTemporaryMessage('Выход из режима работы над ошибками', '#ffd700', 1500);
                }
                
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentMode = btn.dataset.mode;
                
                if (currentMode === 'defend_bb') {
                    if (raiseSizeBlock) raiseSizeBlock.style.display = 'block';
                } else {
                    if (raiseSizeBlock) raiseSizeBlock.style.display = 'none';
                }
                
                updatePositionsVisibility();
                
                if (gamePanel && gamePanel.style.display === 'block') {
                    startNewHand();
                }
            });
        });
    }
    
    function initSizeButtons() {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRaiseSize = btn.dataset.size;
            });
        });
    }
    
    const resetToSetupLink = document.getElementById('resetToSetup');
    if (resetToSetupLink) {
        resetToSetupLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetToSetupScreen();
        });
    }

    // Клик по заголовку → главное меню
    const titleEl = document.querySelector('.trainer__title');
    if (titleEl) {
        titleEl.addEventListener('click', () => {
            resetToSetupScreen();
        });
        titleEl.title = 'На главную';
    }
    
    if (allPositionsCheck) {
        allPositionsCheck.addEventListener('change', (e) => {
            let isChecked = e.target.checked;
            document.querySelectorAll('.pos-check:not([style*="display: none"])').forEach(cb => {
                cb.checked = isChecked;
            });
        });
    }
    
    document.addEventListener('change', (e) => {
        if (e.target.classList && e.target.classList.contains('pos-check')) {
            const visibleCheckboxes = document.querySelectorAll('.pos-check:not([style*="display: none"])');
            const allChecked = visibleCheckboxes.length === document.querySelectorAll('.pos-check:not([style*="display: none"]):checked').length;
            if (allPositionsCheck) allPositionsCheck.checked = allChecked;
        }
    });
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            selectedPositions = [];
            document.querySelectorAll('.pos-check:not([style*="display: none"]):checked').forEach(cb => {
                selectedPositions.push(cb.value);
            });
            
            if (selectedPositions.length === 0) {
                showTemporaryMessage('❌ Выберите хотя бы одну позицию!', '#ff6666', 2000);
                return;
            }
            
            sessionStats = { total: 0, correct: 0 };
            updateSessionStatsUI();
            
            setupPanel.style.display = 'none';
            gamePanel.style.display = 'flex';
            setModesVisible(false);
            startNewHand();
        });
    }
    
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            updateGlobalStatsModal();
            statsModal.style.display = 'flex';
        });
    }
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => statsModal.style.display = 'none');
    if (resetStatsBtn) resetStatsBtn.addEventListener('click', resetStats);
    
    if (reviewErrorsBtn) {
        reviewErrorsBtn.addEventListener('click', startErrorReview);
    }
    
    window.addEventListener('click', (e) => { if (e.target === statsModal) statsModal.style.display = 'none'; });
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (isErrorMode) {
                resultPanel.classList.remove('active');
                if (errorHands.length === 0) {
                    finishErrorReview();
                    return;
                }
                // Переход к следующей ошибке по кругу, без выхода из режима
                currentErrorIndex = (currentErrorIndex + 1) % errorHands.length;
                loadErrorForReview();
            } else {
                resultPanel.classList.remove('active');
                startNewHand();
            }
        });
    }
    
    if (foldBtn) foldBtn.addEventListener('click', () => handleAnswer('fold'));
    if (raiseBtn) raiseBtn.addEventListener('click', () => handleAnswer('raise'));
    
    initModeButtons();
    initSizeButtons();
    loadStats();
    loadErrorsFromLocalStorage();
    updatePositionsVisibility();
    
    console.log('✅ Тренажёр готов! Новые диапазоны загружены.');
    console.log('RFI EP size:', rfiRanges.ep.size);
    console.log('BB vs EP 3bet size:', bbDefense.ep.three.size);
});