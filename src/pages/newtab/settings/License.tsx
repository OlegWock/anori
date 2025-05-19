import './License.scss'
import licenseText from '../../../../LICENSE?raw'

const licenseParagraphs = licenseText.split('\n')

export const License = () => {
    return <div className='License'>
        {licenseParagraphs.map((text, ind) => <p key={ind}>{text}</p>)}
    </div>
};