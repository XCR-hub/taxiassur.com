import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({leads:vi.fn(),subscribe:vi.fn(),accept:vi.fn(),reject:vi.fn(),unsubscribe:vi.fn()}));
vi.mock('@/lib/native-admin-data',()=>({nativeAdminLeads:mocks.leads}));
vi.mock('@/lib/telephony-service',()=>({telephonyService:{onIncomingCall:mocks.subscribe,acceptIncomingCall:mocks.accept,rejectIncomingCall:mocks.reject}}));
vi.mock('@/lib/logger',()=>({logger:{info:vi.fn(),error:vi.fn()}}));
import { IncomingCallNotification } from '../IncomingCallNotification';
beforeEach(()=>{Object.values(mocks).forEach(mock=>mock.mockReset());mocks.subscribe.mockReturnValue(mocks.unsubscribe);});
it('matches a French caller exactly and navigates to the corresponding native lead',async()=>{
  mocks.leads.mockResolvedValue({leads:[{id:'wrong',phone:'0612345679',first_name:'Wrong'},{id:'right',phone:'06 12 34 56 78',first_name:'Camille',last_name:'Martin'}]});
  const navigate=vi.fn();const {unmount}=render(<IncomingCallNotification onNavigateToLead={navigate}/>);
  const call={};await act(async()=>mocks.subscribe.mock.calls[0][0]({from:'+33612345678',call}));
  expect(await screen.findByText('Camille Martin')).toBeInTheDocument();
  expect(mocks.leads).toHaveBeenCalledWith();
  fireEvent.click(screen.getByRole('button',{name:'Accepter'}));
  expect(mocks.accept).toHaveBeenCalledWith(call);expect(navigate).toHaveBeenCalledWith('right');
  unmount();expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});
it('still displays and rejects the call when native lookup is unavailable',async()=>{
  mocks.leads.mockRejectedValue(new Error('invalid_session'));
  render(<IncomingCallNotification/>);const call={};
  await act(async()=>mocks.subscribe.mock.calls[0][0]({from:'+33612345678',call}));
  await waitFor(()=>expect(screen.getByText('+33612345678')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:'Refuser'}));
  expect(mocks.reject).toHaveBeenCalledWith(call);expect(screen.queryByText('Appel entrant')).not.toBeInTheDocument();
});
