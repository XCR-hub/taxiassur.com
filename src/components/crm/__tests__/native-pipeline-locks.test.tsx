import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const { lead }=vi.hoisted(()=>({lead:vi.fn()}));
vi.mock('@/lib/native-admin-data',()=>({nativeAdminLead:lead}));
import { PipelineLocksStatus } from '../PipelineLocksStatus';
beforeEach(()=>lead.mockReset());
it('requires confirmed payment, signed contract and pre-contract documents together',async()=>{
  lead.mockResolvedValue({lead:{payment_confirmed:true,contract_signed:true,can_sign_contract:false}});
  render(<PipelineLocksStatus leadId="lead-id"/>);
  expect(await screen.findByText('Documents complémentaires avant contrat manquants')).toBeInTheDocument();
  expect(screen.queryByText(/Dossier prêt/)).not.toBeInTheDocument();
});
it('allows activation only when all three native booleans are true',async()=>{
  lead.mockResolvedValue({lead:{payment_confirmed:true,contract_signed:true,can_sign_contract:true}});
  render(<PipelineLocksStatus leadId="lead-id"/>);
  expect(await screen.findByText(/Dossier prêt pour activation client/)).toBeInTheDocument();
});
it('shows a verification failure instead of retaining a previous cleared dossier',async()=>{
  lead.mockResolvedValueOnce({lead:{payment_confirmed:true,contract_signed:true,can_sign_contract:true}}).mockRejectedValueOnce(new Error('invalid_session'));
  const {rerender}=render(<PipelineLocksStatus leadId="first"/>);
  await screen.findByText(/Dossier prêt/);rerender(<PipelineLocksStatus leadId="second"/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de vérifier');
  expect(screen.queryByText(/Dossier prêt/)).not.toBeInTheDocument();
});
it('ignores a late result from a different dossier',async()=>{
  let finish!:(value:unknown)=>void;
  lead.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({lead:{}});
  const {rerender}=render(<PipelineLocksStatus leadId="first"/>);rerender(<PipelineLocksStatus leadId="second"/>);
  await screen.findByText('Paiement non confirmé');
  await act(async()=>finish({lead:{payment_confirmed:true,contract_signed:true,can_sign_contract:true}}));
  expect(screen.queryByText(/Dossier prêt/)).not.toBeInTheDocument();
});
