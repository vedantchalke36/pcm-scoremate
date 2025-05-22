let chart;
let scoreStats = {
  correct: 0,
  wrong: 0,
  notAttempted: 0
};

// Define the function to be injected
const calculatePCMScore = () => {
  try {
    const rows = document.querySelectorAll('#tblObjection > tbody > tr:nth-child(n+2)');
    
    if (!rows || rows.length === 0) {
      throw new Error("Could not find answer table. Please make sure you're on the correct page.");
    }

    // Verify if this is a PCM response sheet
    if (rows.length !== 150) {
      throw new Error(`This appears to be a ${rows.length > 150 ? 'PCB' : 'different'} response sheet. Please use a PCM response sheet with exactly 150 questions.`);
    }

    let correctAnswersPhysics = 0;
    let wrongAnswersPhysics = 0;
    let unattemptedPhysics = 0;
    let correctAnswersChemistry = 0;
    let wrongAnswersChemistry = 0;
    let unattemptedChemistry = 0;
    let correctAnswersMathematics = 0;
    let wrongAnswersMathematics = 0;
    let unattemptedMathematics = 0;

    rows.forEach((row, index) => {
      const correctOptionElement = row.querySelector('td:nth-child(3) > table.table.table-responsive.table-bordered.center > tbody > tr > td:nth-child(1) > span');
      const candidateResponseElement = row.querySelector('td:nth-child(3) > table.table.table-responsive.table-bordered.center > tbody > tr > td:nth-child(2) > span');

      const correctOption = correctOptionElement ? correctOptionElement.textContent.trim() : '';
      const candidateResponse = candidateResponseElement ? candidateResponseElement.textContent.trim() : '';

      if (index < 50) {
        if (!candidateResponse) {
          unattemptedPhysics++;
        } else if (correctOption === candidateResponse) {
          correctAnswersPhysics++;
        } else {
          wrongAnswersPhysics++;
        }
      } else if (index < 100) {
        if (!candidateResponse) {
          unattemptedChemistry++;
        } else if (correctOption === candidateResponse) {
          correctAnswersChemistry++;
        } else {
          wrongAnswersChemistry++;
        }
      } else {
        if (!candidateResponse) {
          unattemptedMathematics++;
        } else if (correctOption === candidateResponse) {
          correctAnswersMathematics++;
        } else {
          wrongAnswersMathematics++;
        }
      }
    });

    // Calculate total score with Mathematics having double weight
    const totalScore = correctAnswersPhysics + correctAnswersChemistry + (correctAnswersMathematics * 2);

    return {
      output: `\nPhysics - Correct Answers: ${correctAnswersPhysics}, Wrong Answers: ${wrongAnswersPhysics}, Unattempted: ${unattemptedPhysics}\nChemistry - Correct Answers: ${correctAnswersChemistry}, Wrong Answers: ${wrongAnswersChemistry}, Unattempted: ${unattemptedChemistry}\nMathematics - Correct Answers: ${correctAnswersMathematics}, Wrong Answers: ${wrongAnswersMathematics}, Unattempted: ${unattemptedMathematics}\nTotal Score: ${totalScore} out of 200`
    };
  } catch (error) {
    return {
      output: `Error: ${error.message}`,
      error: true
    };
  }
};

document.getElementById("calculate").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error("No active tab found. Please try again.");
    }

    if (!tab.url.includes('ot.mhexam.com')) {
      throw new Error("Please navigate to the MHT CET result page first.");
    }

    setLoading("calculate", true);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: calculatePCMScore
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error("Failed to execute script. Please refresh the page and try again.");
    }

    const output = results[0].result.output;
    
    if (results[0].result.error) {
      throw new Error(output.replace('Error: ', ''));
    }

    // Parse the output
    const physicsMatch = output.match(/Physics - Correct Answers: (\d+), Wrong Answers: (\d+), Unattempted: (\d+)/);
    const chemistryMatch = output.match(/Chemistry - Correct Answers: (\d+), Wrong Answers: (\d+), Unattempted: (\d+)/);
    const mathematicsMatch = output.match(/Mathematics - Correct Answers: (\d+), Wrong Answers: (\d+), Unattempted: (\d+)/);
    const totalMatch = output.match(/Total Score: (\d+)/);

    if (!physicsMatch || !chemistryMatch || !mathematicsMatch || !totalMatch) {
      throw new Error("Failed to parse the results. Please try again.");
    }

    // Calculate unattempted questions for each subject
    const physicsCorrect = parseInt(physicsMatch[1]);
    const physicsWrong = parseInt(physicsMatch[2]);
    const physicsUnattempted = parseInt(physicsMatch[3]);

    const chemistryCorrect = parseInt(chemistryMatch[1]);
    const chemistryWrong = parseInt(chemistryMatch[2]);
    const chemistryUnattempted = parseInt(chemistryMatch[3]);

    const mathematicsCorrect = parseInt(mathematicsMatch[1]);
    const mathematicsWrong = parseInt(mathematicsMatch[2]);
    const mathematicsUnattempted = parseInt(mathematicsMatch[3]);

    // Update the score cards
    document.getElementById('physics-correct').textContent = physicsCorrect;
    document.getElementById('physics-wrong').textContent = physicsWrong;
    document.getElementById('physics-unattempted').textContent = physicsUnattempted;

    document.getElementById('chemistry-correct').textContent = chemistryCorrect;
    document.getElementById('chemistry-wrong').textContent = chemistryWrong;
    document.getElementById('chemistry-unattempted').textContent = chemistryUnattempted;

    document.getElementById('mathematics-correct').textContent = mathematicsCorrect;
    document.getElementById('mathematics-wrong').textContent = mathematicsWrong;
    document.getElementById('mathematics-unattempted').textContent = mathematicsUnattempted;

    document.getElementById('total-score').textContent = totalMatch[1];

    // Calculate stats for chart
    const correct = physicsCorrect + chemistryCorrect + mathematicsCorrect;
    const wrong = physicsWrong + chemistryWrong + mathematicsWrong;
    const notAttempted = physicsUnattempted + chemistryUnattempted + mathematicsUnattempted;

    scoreStats = { correct, wrong, notAttempted };
    
    // Show results section and render chart
    document.getElementById('results').style.display = 'flex';
    renderChart(scoreStats);

    // Save to history
    saveToHistory({
      correct: physicsCorrect,
      wrong: physicsWrong,
      notAttempted: physicsUnattempted,
      subject: 'Physics'
    });
    saveToHistory({
      correct: chemistryCorrect,
      wrong: chemistryWrong,
      notAttempted: chemistryUnattempted,
      subject: 'Chemistry'
    });
    saveToHistory({
      correct: mathematicsCorrect,
      wrong: mathematicsWrong,
      notAttempted: mathematicsUnattempted,
      subject: 'Mathematics'
    });

    // Add analysis cards for each subject
    const resultsContainer = document.getElementById('results');
    
    // Physics Analysis
    const physicsAnalysis = updateAnalysisCard('Physics', physicsCorrect, physicsWrong, physicsUnattempted);
    resultsContainer.appendChild(physicsAnalysis);
    
    // Chemistry Analysis
    const chemistryAnalysis = updateAnalysisCard('Chemistry', chemistryCorrect, chemistryWrong, chemistryUnattempted);
    resultsContainer.appendChild(chemistryAnalysis);
    
    // Mathematics Analysis
    const mathematicsAnalysis = updateAnalysisCard('Mathematics', mathematicsCorrect, mathematicsWrong, mathematicsUnattempted);
    resultsContainer.appendChild(mathematicsAnalysis);
  } catch (error) {
    handleError(error, 'calculate score');
  } finally {
    setLoading("calculate", false);
  }
});

document.getElementById("predict").addEventListener("click", () => {
  try {
    const totalScore = parseInt(document.getElementById('total-score').textContent);
    if (isNaN(totalScore)) {
      throw new Error("Please calculate the score first");
    }

    const percentile = getPercentile(totalScore);
    const percentileDisplay = document.getElementById('percentile');
    const percentileValue = document.getElementById('percentile-value');
    
    percentileValue.textContent = `${percentile.toFixed(3)}%`;
    percentileDisplay.style.display = 'block';
  } catch (error) {
    console.error("Error in predict:", error);
    document.getElementById("percentile").textContent = "Error calculating percentile";
  }
});

function renderChart({ correct, wrong, notAttempted }) {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  if (chart) chart.destroy();
  
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Wrong', 'Not Attempted'],
      datasets: [{
        data: [correct, wrong, notAttempted],
        backgroundColor: [
          'rgba(72, 187, 120, 0.8)',  // green
          'rgba(245, 101, 101, 0.8)', // red
          'rgba(160, 174, 192, 0.8)'  // gray
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: { 
            color: '#E2E8F0',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(45, 55, 72, 0.9)',
          titleColor: '#E2E8F0',
          bodyColor: '#E2E8F0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      }
    }
  });
}

document.getElementById("export").addEventListener("click", () => {
  const element = document.body.cloneNode(true);
  element.querySelectorAll('canvas').forEach(canvas => {
    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    canvas.parentNode.replaceChild(img, canvas);
  });
  
  const opt = {
    margin: 1,
    filename: 'MHTCET-Report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
});

// Add loading state to buttons
function setLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `
      <svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Calculating...
    `;
  } else {
    button.disabled = false;
    button.innerHTML = 'Calculate Score';
  }
}

function analyzeScore(correct, wrong, unattempted) {
  const total = correct + wrong + unattempted;
  const accuracy = (correct / total) * 100;
  const efficiency = (correct / (correct + wrong)) * 100;
  const timeManagement = ((correct + wrong) / total) * 100;
  
  return {
    accuracy: accuracy.toFixed(1),
    efficiency: efficiency.toFixed(1),
    timeManagement: timeManagement.toFixed(1),
    suggestion: getSuggestion(accuracy, efficiency, timeManagement)
  };
}

function getSuggestion(accuracy, efficiency, timeManagement) {
  let suggestions = [];
  
  if (accuracy > 80 && efficiency > 90) {
    suggestions.push("Excellent performance! Keep up the good work.");
  } else if (accuracy > 60 && efficiency > 70) {
    suggestions.push("Good performance. Focus on reducing unattempted questions.");
  } else {
    suggestions.push("Work on improving accuracy and attempt more questions.");
  }

  if (timeManagement < 70) {
    suggestions.push("Try to manage your time better to attempt more questions.");
  }

  if (efficiency < 60) {
    suggestions.push("Focus on reducing wrong answers to improve efficiency.");
  }

  return suggestions.join(" ");
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'c') {
    const output = document.getElementById('output').textContent;
    copyToClipboard(output);
  }
});

function handleError(error, context) {
  console.error(`Error in ${context}:`, error);
  showToast(`Error: ${error.message}`);
}

function saveToHistory(score) {
  const history = JSON.parse(localStorage.getItem('scoreHistory') || '[]');
  history.push({
    ...score,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('scoreHistory', JSON.stringify(history.slice(-5)));
}

// Add this function to update the analysis card
function updateAnalysisCard(subject, correct, wrong, unattempted) {
  const analysis = analyzeScore(correct, wrong, unattempted);
  
  const analysisCard = document.createElement('div');
  analysisCard.className = 'analysis-card';
  analysisCard.innerHTML = `
    <div class="analysis-header">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <span>${subject} Analysis</span>
    </div>
    <div class="analysis-content">
      <div class="analysis-item">
        <svg class="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="analysis-label">Accuracy</span>
        <span class="analysis-value">${analysis.accuracy}%</span>
      </div>
      <div class="analysis-item">
        <svg class="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <span class="analysis-label">Efficiency</span>
        <span class="analysis-value">${analysis.efficiency}%</span>
      </div>
      <div class="analysis-item">
        <svg class="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="analysis-label">Time Management</span>
        <span class="analysis-value">${analysis.timeManagement}%</span>
      </div>
    </div>
  `;

  // Add animation class
  analysisCard.classList.add('fade-in');
  
  return analysisCard;
}
