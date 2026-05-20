import { useState, useEffect } from 'react'
import { 
  Plus, Trash2, Edit2, ChevronLeft, Dumbbell, Timer, History, Save, X, 
  ChevronRight, Activity, TrendingUp, Scale, ArrowUp, ArrowDown, Target,
  ChevronDown, ChevronUp, FileText
} from 'lucide-react'
import { supabase } from './supabaseClient'
import './App.css'

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export default function App() {
  const [user, setUser] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  
  if (!user) {
    return <UserSelection onSelect={setUser} />
  }

  if (!selectedDay) {
    return <DaySelection user={user} onSelect={setSelectedDay} onBack={() => setUser(null)} />
  }

  return <DayTracker user={user} day={selectedDay} onBack={() => setSelectedDay(null)} />
}

function UserSelection({ onSelect }) {
  return (
    <div className="app-container">
      <div className="user-selection animate-fade-in">
        <h1>Chi sei?</h1>
        <p>Seleziona il tuo profilo per accedere alla scheda</p>
        
        <div className="user-cards">
          <div className="user-card glass-panel" onClick={() => onSelect('gabriele')}>
            <div className="avatar">G</div>
            <div className="user-name">Gabriele</div>
          </div>
          
          <div className="user-card glass-panel" onClick={() => onSelect('miriam')}>
            <div className="avatar">M</div>
            <div className="user-name">Miriam</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DaySelection({ user, onSelect, onBack }) {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCounts() {
      setLoading(true)
      const { data, error } = await supabase
        .from('workouts')
        .select('day_of_week, data')
        .eq('user_name', user)
      
      if (data && !error) {
        const newCounts = {}
        data.forEach(row => {
          newCounts[row.day_of_week] = row.data ? row.data.length : 0
        })
        setCounts(newCounts)
      }
      setLoading(false)
    }
    loadCounts()
  }, [user])

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <button className="btn btn-outline" onClick={onBack}>
          <ChevronLeft size={20} />
          Uscita
        </button>
        
        <div className="tracker-header">
          <div className="title">Scheda di {user.charAt(0).toUpperCase() + user.slice(1)}</div>
          <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', background: user === 'gabriele' ? 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)' }}>
            {user.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <h2 style={{ marginBottom: '1.5rem' }}>Seleziona il Giorno</h2>

      <div className="days-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sincronizzazione in corso...</div>
        ) : (
          DAYS.map(day => (
            <div key={day} className="day-card glass-panel" onClick={() => onSelect(day)}>
              <div className="day-info">
                <span>{day}</span>
                <span className="day-count">{counts[day] || 0} Esercizi</span>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DayTracker({ user, day, onBack }) {
  const [exercises, setExercises] = useState([])
  const [activeTab, setActiveTab] = useState('scheda') // 'scheda' | 'andamento'
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedExercises, setExpandedExercises] = useState({})
  
  const toggleCollapse = (id) => {
    setExpandedExercises(prev => ({...prev, [id]: !prev[id]}))
  }
  
  // Load for specific day from Supabase
  useEffect(() => {
    async function fetchExercises() {
      setLoading(true)
      const { data, error } = await supabase
        .from('workouts')
        .select('data')
        .eq('user_name', user)
        .eq('day_of_week', day)
        .single()
      
      if (data && data.data) {
        setExercises(data.data)
      } else {
        setExercises([])
      }
      setLoading(false)
    }

    fetchExercises()
  }, [user, day])

  // Save to Supabase
  const saveExercises = async (newExercises) => {
    setExercises(newExercises)
    setSaving(true)
    
    // Check if row already exists
    const { data: existingData } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_name', user)
      .eq('day_of_week', day)
      .single()

    if (existingData) {
      await supabase
        .from('workouts')
        .update({ data: newExercises })
        .eq('id', existingData.id)
    } else {
      await supabase
        .from('workouts')
        .insert([{ user_name: user, day_of_week: day, data: newExercises }])
    }
    
    setSaving(false)
  }

  const handleAdd = (exerciseData) => {
    const newEx = {
      ...exerciseData,
      id: crypto.randomUUID(),
      history: []
    }
    saveExercises([...exercises, newEx])
    setIsAdding(false)
  }

  const handleUpdate = (id, updatedData) => {
    saveExercises(exercises.map(ex => {
      if (ex.id === id) {
        let newHistory = [...(ex.history || [])]
        const weightChanged = ex.weight !== updatedData.weight
        const repsChanged = ex.repsDone !== updatedData.repsDone
        const rirChanged = ex.rir !== updatedData.rir

        if ((weightChanged || repsChanged || rirChanged) && (ex.weight || ex.repsDone || ex.rir)) {
          newHistory.unshift({
            date: new Date().toISOString(),
            weight: ex.weight,
            repsDone: ex.repsDone,
            rir: ex.rir
          })
        }

        return { ...ex, ...updatedData, history: newHistory }
      }
      return ex
    }))
    setEditingId(null)
  }

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo esercizio?')) {
      saveExercises(exercises.filter(ex => ex.id !== id))
    }
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const newEx = [...exercises]
    const temp = newEx[index - 1]
    newEx[index - 1] = newEx[index]
    newEx[index] = temp
    saveExercises(newEx)
  }

  const handleMoveDown = (index) => {
    if (index === exercises.length - 1) return
    const newEx = [...exercises]
    const temp = newEx[index + 1]
    newEx[index + 1] = newEx[index]
    newEx[index] = temp
    saveExercises(newEx)
  }

  // Generate timeline for "Andamento"
  const historyEntries = exercises.flatMap(ex => 
    (ex.history || []).map(h => ({ ...h, exerciseName: ex.name }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date))

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Caricamento scheda dal cloud in corso...</p>
      </div>
    )
  }

  return (
    <div className="app-container animate-fade-in">
      <header className="header" style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-outline" onClick={onBack}>
          <ChevronLeft size={20} />
          {day}
        </button>
        
        <div className="tracker-header">
          {saving && <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Salvataggio in corso...</span>}
          <div className="title">Scheda di {user.charAt(0).toUpperCase() + user.slice(1)}</div>
        </div>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'scheda' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheda')}
        >
          <Dumbbell size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom'}} />
          Scheda Esercizi
        </button>
        <button 
          className={`tab ${activeTab === 'andamento' ? 'active' : ''}`}
          onClick={() => setActiveTab('andamento')}
        >
          <TrendingUp size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom'}} />
          Andamento
        </button>
      </div>

      {activeTab === 'scheda' && (
        <div className="animate-fade-in">
          {!isAdding && !editingId && (
            <button className="btn btn-primary" style={{ marginBottom: '2rem', width: '100%' }} onClick={() => setIsAdding(true)}>
              <Plus size={20} />
              Nuovo Esercizio per {day}
            </button>
          )}

          {isAdding && (
            <ExerciseForm 
              onSubmit={handleAdd} 
              onCancel={() => setIsAdding(false)} 
            />
          )}

          <div className="exercise-list">
            {exercises.length === 0 && !isAdding ? (
              <div className="empty-state glass-panel">
                <Dumbbell size={48} className="empty-icon" />
                <h3>Giorno libero o vuoto</h3>
                <p>Aggiungi il primo esercizio per {day}</p>
              </div>
            ) : (
              exercises.map((ex, index) => (
                <div key={ex.id} className="exercise-item glass-panel animate-fade-in">
                  {editingId === ex.id ? (
                    <ExerciseForm 
                      initialData={ex}
                      onSubmit={(data) => handleUpdate(ex.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="exercise-header">
                        <div 
                          className="exercise-name" 
                          onClick={() => toggleCollapse(ex.id)}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}
                        >
                          <Activity size={20} color="var(--primary)" />
                          {ex.name}
                          {expandedExercises[ex.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        <div className="actions">
                          {exercises.length > 1 && (
                            <div style={{ display: 'flex', borderRight: '1px solid var(--glass-border)', paddingRight: '0.5rem', marginRight: '0.25rem' }}>
                              <button className="icon-btn" disabled={index === 0} onClick={() => handleMoveUp(index)} aria-label="Sposta Su" style={{ opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'default' : 'pointer' }}>
                                <ArrowUp size={18} />
                              </button>
                              <button className="icon-btn" disabled={index === exercises.length - 1} onClick={() => handleMoveDown(index)} aria-label="Sposta Giù" style={{ opacity: index === exercises.length - 1 ? 0.3 : 1, cursor: index === exercises.length - 1 ? 'default' : 'pointer' }}>
                                <ArrowDown size={18} />
                              </button>
                            </div>
                          )}
                          <button className="icon-btn primary" onClick={() => setEditingId(ex.id)} aria-label="Modifica / Aggiorna">
                            <Edit2 size={18} />
                          </button>
                          <button className="icon-btn danger" onClick={() => handleDelete(ex.id)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {expandedExercises[ex.id] && (
                        <div className="exercise-stats animate-fade-in">
                          <div className="stat-item">
                            <span className="stat-label">Serie & Reps</span>
                            <span className="stat-value">{ex.sets} x {ex.repsRange}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">
                              <Timer size={14} /> Recupero
                            </span>
                            <span className="stat-value">{ex.rest || '-'}</span>
                          </div>
                          <div className="stat-item full-width" style={{ display: 'none' }}></div>
                          <div className="stat-item full-width" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                            <span className="stat-label">
                              <Scale size={14} /> Peso
                            </span>
                            <span className="stat-value highlight">{ex.weight || '-'}</span>
                          </div>
                          <div className="stat-item full-width" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                            <span className="stat-label">
                              <History size={14} /> Reps Fatte
                            </span>
                            <span className="stat-value highlight">{ex.repsDone || '-'}</span>
                          </div>
                          <div className="stat-item full-width" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                            <span className="stat-label">
                              <Target size={14} color="var(--danger)" /> Obiettivo RIR
                            </span>
                            <span className="stat-value" style={{ color: 'var(--danger)' }}>{ex.rir || '-'}</span>
                          </div>
                          {ex.notes && (
                            <div className="stat-item full-width" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                              <span className="stat-label">
                                <FileText size={14} /> Note
                              </span>
                              <span className="stat-value" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '0.9rem', marginTop: '0.25rem' }}>{ex.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'andamento' && (
        <div className="animate-fade-in">
          {historyEntries.length === 0 ? (
            <div className="empty-state glass-panel">
              <TrendingUp size={48} className="empty-icon" />
              <h3>Nessun andamento registrato</h3>
              <p>Quando modifichi il peso, ripetizioni o RIR, lo storico apparirà qui.</p>
            </div>
          ) : (
            <div className="history-timeline">
              {historyEntries.map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-date">
                    {new Date(h.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </div>
                  <div className="history-content">
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-light)' }}>{h.exerciseName}</h4>
                    <div className="history-metrics">
                      <div><strong>Peso:</strong> {h.weight || '-'}</div>
                      <div><strong>Reps:</strong> {h.repsDone || '-'}</div>
                      <div><strong>RIR:</strong> {h.rir || '-'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExerciseForm({ onSubmit, onCancel, initialData }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    sets: 3,
    repsRange: '',
    rest: '',
    weight: '',
    repsDone: '',
    rir: '',
    notes: ''
  })

  const [setsCount, setSetsCount] = useState(() => {
    const s = parseInt(initialData?.sets || 3);
    return isNaN(s) || s < 1 ? 3 : (s > 5 ? 5 : s);
  })

  const [repsArray, setRepsArray] = useState(() => {
    const defaultArr = Array(5).fill('');
    if (initialData?.repsDone) {
      const arr = initialData.repsDone.split(',').map(s => s.trim());
      for (let i = 0; i < arr.length && i < 5; i++) defaultArr[i] = arr[i];
    }
    return defaultArr;
  })

  useEffect(() => {
    setFormData(prev => ({...prev, sets: setsCount}))
  }, [setsCount])

  const handleRepChange = (index, value) => {
    const newArr = [...repsArray]
    newArr[index] = value
    setRepsArray(newArr)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name) return
    const activeReps = repsArray.slice(0, setsCount)
    const finalRepsDone = activeReps.some(r => r !== '') ? activeReps.join(',') : ''
    onSubmit({ ...formData, repsDone: finalRepsDone })
  }

  return (
    <form className="add-exercise-form glass-panel animate-fade-in" onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '0.5rem' }}>{initialData ? 'Aggiorna Progresso / Modifica' : 'Nuovo Esercizio'}</h3>
      <div className="input-group">
        <label>Nome Esercizio</label>
        <input 
          autoFocus={!initialData}
          className="input-field" 
          placeholder="es. Panca Piana"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>
      
      <div className="grid-cols-2">
        <div className="input-group">
          <label>Serie</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--glass-bg)', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <button type="button" className="icon-btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => setSetsCount(Math.max(1, setsCount - 1))}>-</button>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '1.5rem', textAlign: 'center', flex: 1 }}>{setsCount}</span>
            <button type="button" className="icon-btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => setSetsCount(Math.min(5, setsCount + 1))}>+</button>
          </div>
        </div>
        <div className="input-group">
          <label>Range Ripetizioni</label>
          <input 
            className="input-field" 
            placeholder="es. 8-10"
            value={formData.repsRange}
            onChange={e => setFormData({...formData, repsRange: e.target.value})}
          />
        </div>
      </div>
      
      <div className="grid-cols-2">
        <div className="input-group">
          <label>Recupero</label>
          <input 
            className="input-field" 
            placeholder="es. 90s"
            value={formData.rest}
            onChange={e => setFormData({...formData, rest: e.target.value})}
          />
        </div>
        <div className="input-group">
          <label>RIR (Riserva)</label>
          <input 
            className="input-field" 
            placeholder="es. 1-2"
            value={formData.rir}
            onChange={e => setFormData({...formData, rir: e.target.value})}
          />
        </div>
      </div>

      <div style={{ margin: '1rem 0', height: '1px', background: 'var(--glass-border)' }}></div>

      <div className="input-group">
        <label style={{ color: 'var(--primary)' }}>Peso Attuale</label>
        <input 
          className="input-field" 
          style={{ borderColor: 'rgba(99, 102, 241, 0.5)' }}
          placeholder="es. 80kg"
          value={formData.weight}
          onChange={e => setFormData({...formData, weight: e.target.value})}
        />
      </div>
      
      <div className="input-group" style={{ marginTop: '1rem' }}>
        <label style={{ color: 'var(--primary)' }}>Ripetizioni Fatte</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Array.from({ length: setsCount }).map((_, i) => (
            <div key={i} style={{ flex: '1 1 50px' }}>
              <input 
                className="input-field"
                style={{ borderColor: 'rgba(99, 102, 241, 0.5)', textAlign: 'center', padding: '0.5rem' }}
                placeholder={`S${i+1}`}
                value={repsArray[i] || ''}
                onChange={e => handleRepChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="input-group" style={{ marginTop: '1rem' }}>
        <label>Note</label>
        <textarea
          className="input-field"
          style={{ minHeight: '80px', resize: 'vertical' }}
          placeholder="Aggiungi appunti, variazioni o sensazioni..."
          value={formData.notes || ''}
          onChange={e => setFormData({...formData, notes: e.target.value})}
        />
      </div>
      {(initialData?.weight !== formData.weight || initialData?.repsDone !== formData.repsDone || initialData?.rir !== formData.rir) && initialData && (
        <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.5rem' }}>
          Salvando questo aggiornamento, il vecchio risultato (Peso, Reps e RIR) verrà archiviato in "Andamento".
        </p>
      )}
      
      <div className="actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          <X size={18} />
          Annulla
        </button>
        <button type="submit" className="btn btn-primary" disabled={!formData.name}>
          <Save size={18} />
          {initialData ? 'Aggiorna' : 'Salva'}
        </button>
      </div>
    </form>
  )
}
