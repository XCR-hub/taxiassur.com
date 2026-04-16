import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

interface FormData {
  nom: string
  prenom: string
  email: string
  telephone: string
  ville: string
  immatriculation: string
  vehicule_type: string
}

export function QuoteForm({ city }: { city?: string }) {
  const [form, setForm] = useState<FormData>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    ville: city || '',
    immatriculation: '',
    vehicule_type: 'berline',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.rpc('upsert_lead_from_form', {
      p_nom: form.nom,
      p_prenom: form.prenom,
      p_email: form.email,
      p_telephone: form.telephone,
      p_ville: form.ville,
      p_immatriculation: form.immatriculation,
      p_vehicle_type: form.vehicule_type,
    })

    if (insertError) {
      const { error: fallbackError } = await supabase.from('crm_leads').insert({
        last_name: form.nom,
        first_name: form.prenom,
        email: form.email,
        phone: form.telephone,
        city: form.ville,
        vehicle_registration: form.immatriculation,
        vehicle_type: form.vehicule_type,
        source: 'website',
        status: 'nouveau_lead',
      })

      if (fallbackError) {
        setError('Une erreur est survenue. Veuillez reessayer.')
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="form-success">
        <div className="success-icon">&#10003;</div>
        <h3>Demande envoyee avec succes !</h3>
        <p>Un conseiller vous contactera sous 24h pour votre devis personnalise.</p>
      </div>
    )
  }

  return (
    <form className="quote-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="prenom">Prenom</label>
          <input
            id="prenom"
            type="text"
            required
            value={form.prenom}
            onChange={e => update('prenom', e.target.value)}
            placeholder="Votre prenom"
          />
        </div>
        <div className="form-group">
          <label htmlFor="nom">Nom</label>
          <input
            id="nom"
            type="text"
            required
            value={form.nom}
            onChange={e => update('nom', e.target.value)}
            placeholder="Votre nom"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="votre@email.com"
          />
        </div>
        <div className="form-group">
          <label htmlFor="telephone">Telephone</label>
          <input
            id="telephone"
            type="tel"
            required
            value={form.telephone}
            onChange={e => update('telephone', e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="ville">Ville</label>
          <input
            id="ville"
            type="text"
            required
            value={form.ville}
            onChange={e => update('ville', e.target.value)}
            placeholder="Votre ville"
          />
        </div>
        <div className="form-group">
          <label htmlFor="vehicule_type">Type de vehicule</label>
          <select
            id="vehicule_type"
            value={form.vehicule_type}
            onChange={e => update('vehicule_type', e.target.value)}
          >
            <option value="berline">Berline</option>
            <option value="van">Van / Minibus</option>
            <option value="hybride">Hybride</option>
            <option value="electrique">Electrique</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="immatriculation">Immatriculation</label>
        <input
          id="immatriculation"
          type="text"
          value={form.immatriculation}
          onChange={e => update('immatriculation', e.target.value)}
          placeholder="AA-123-BB (optionnel)"
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Envoi en cours...' : 'Obtenir mon devis gratuit'}
      </button>
    </form>
  )
}
