import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrackingUpload } from './TrackingUpload'

function csvFile(text, name = 'session.csv') {
  return new File([text], name, { type: 'text/csv' })
}

async function upload(user, text) {
  render(<TrackingUpload playerId="p1" authToken="tok" />)
  const input = document.querySelector('input[type="file"]')
  await user.upload(input, csvFile(text))
}

describe('TrackingUpload', () => {
  it('refuses to upload when the Pitcher column exists but names could not be identified', async () => {
    const user = userEvent.setup()
    const csv = [
      'RelSpeed,SpinRate,InducedVertBreak,TaggedPitchType,Pitcher',
      '93,2300,15,Fastball,',
      '84,2450,2,Slider,',
    ].join('\n')

    await upload(user, csv)

    expect(await screen.findByText(/Couldn.t identify pitcher names/)).toBeInTheDocument()
    // Never reaches the parsed/preview state where an unfiltered upload could be submitted.
    expect(screen.queryByRole('button', { name: /^Save \d+ pitches$/ })).not.toBeInTheDocument()
  })

  it('still uploads normally when there is no Pitcher column at all (single implicit pitcher)', async () => {
    const user = userEvent.setup()
    const csv = [
      'RelSpeed,SpinRate,InducedVertBreak,TaggedPitchType',
      '93,2300,15,Fastball',
      '84,2450,2,Slider',
    ].join('\n')

    await upload(user, csv)

    expect(await screen.findByRole('button', { name: 'Save 2 pitches' })).toBeInTheDocument()
  })

  it('still shows the pitcher-selection screen when multiple named pitchers are found', async () => {
    const user = userEvent.setup()
    const csv = [
      'RelSpeed,SpinRate,InducedVertBreak,TaggedPitchType,Pitcher',
      '93,2300,15,Fastball,Saul',
      '84,2450,2,Slider,Lake',
    ].join('\n')

    await upload(user, csv)

    expect(await screen.findByText(/2 pitchers found/)).toBeInTheDocument()
    expect(screen.getByText('Saul')).toBeInTheDocument()
    expect(screen.getByText('Lake')).toBeInTheDocument()
  })
})
